import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Order, TrackingEvent } from "@/types/order";
import { sendOrderStatusUpdateEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 * Retrieves an order document if it belongs to the authenticated user.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in GET /api/orders/[id]:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const orderDocRef = db.collection("orders").doc(id);
    const snap = await orderDocRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = snap.data();
    const isOwner = data?.userId === uid;
    const isMerchant =
      data?.store?.id === uid ||
      (Array.isArray(data?.storeIds) && data.storeIds.includes(uid)) ||
      (Array.isArray(data?.items) && data.items.some((it: any) => it.storeId === uid));

    if (!isOwner && !isMerchant) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this order" }, { status: 403 });
    }

    return NextResponse.json({ success: true, order: { id: snap.id, ...data } }, { status: 200 });
  } catch (error) {
    console.error("Error retrieving order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 * Cancels or updates an order in Firestore database (accessible by buyer or merchant).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in PATCH /api/orders/[id]:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const orderDocRef = db.collection("orders").doc(id);
    const snap = await orderDocRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const existingOrder = snap.data() as Order & { userId: string; storeIds?: string[] };
    const isOwner = existingOrder.userId === uid;
    const isMerchant =
      existingOrder.store?.id === uid ||
      (Array.isArray(existingOrder.storeIds) && existingOrder.storeIds.includes(uid)) ||
      (Array.isArray(existingOrder.items) && existingOrder.items.some((it: any) => it.storeId === uid));

    if (!isOwner && !isMerchant) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to modify this order" }, { status: 403 });
    }

    const body = await request.json();
    const nowIso = new Date().toISOString();

    // Action 1: Cancel order
    if (body.action === "cancel" || body.status === "CANCELLED") {
      if (existingOrder.status === "DELIVERED" || existingOrder.status === "CANCELLED") {
        return NextResponse.json(
          { error: `Cannot cancel an order that is already ${existingOrder.status.toLowerCase()}` },
          { status: 400 }
        );
      }

      const reason = body.reason || (isMerchant ? "Merchant cancelled order" : "Customer requested cancellation");

      const cancelEvent: TrackingEvent = {
        status: "CANCELLED",
        title: "Order Cancelled & Refund Initiated",
        description: `Reason: ${reason}. Full refund processed to ${existingOrder.payment?.method || "original payment method"}.`,
        location: "Sellora Order Operations",
        timestamp: nowIso,
        completed: true,
        current: true,
      };

      const updatedEvents: TrackingEvent[] = (existingOrder.trackingEvents || []).map((e) => ({
        ...e,
        current: false,
      }));
      updatedEvents.push(cancelEvent);

      const updates: Partial<Order> = {
        status: "CANCELLED",
        cancelledAt: nowIso,
        cancellationReason: reason,
        payment: {
          ...existingOrder.payment,
          status: "REFUNDED",
        },
        trackingEvents: updatedEvents,
      };

      await orderDocRef.update(updates);

      // Sync to all merchant store subcollections
      const targetStoreIds = Array.from(
        new Set([existingOrder.store?.id, ...(existingOrder.storeIds || [])].filter(Boolean))
      );
      for (const sId of targetStoreIds) {
        if (sId && sId !== "sellora-official") {
          try {
            await db.collection("stores").doc(sId).collection("orders").doc(id).update(updates);
          } catch {
            // ignore
          }
        }
      }

      const finalOrder: Order = { ...existingOrder, ...updates };

      // Dispatch status update email notification (non-blocking)
      sendOrderStatusUpdateEmail(finalOrder, "CANCELLED", reason ? `Cancellation reason: ${reason}` : undefined).catch((e) =>
        console.warn("[Sellora Email] Cancellation notification error:", e)
      );

      return NextResponse.json({ success: true, order: finalOrder }, { status: 200 });
    }

    // Action 2: Update status by Merchant (e.g. PROCESSING -> IN_TRANSIT -> DELIVERED)
    if (body.action === "update_status" || (body.status && ["PROCESSING", "IN_TRANSIT", "DELIVERED"].includes(body.status))) {
      if (!isMerchant && !isOwner) {
        return NextResponse.json({ error: "Forbidden: Only merchants can advance order fulfillment status" }, { status: 403 });
      }

      const newStatus = body.status as Order["status"];
      const updates: Partial<Order> = {
        status: newStatus,
      };

      if (body.carrier) updates.carrier = body.carrier;
      if (body.trackingNumber) updates.trackingNumber = body.trackingNumber;

      if (newStatus === "DELIVERED") {
        updates.deliveredAt = nowIso;
      }

      // Advance tracking events appropriately
      const updatedEvents = (existingOrder.trackingEvents || []).map((e) => {
        if (newStatus === "IN_TRANSIT") {
          if (e.status === "ORDER_PLACED" || e.status === "PROCESSING") return { ...e, completed: true, current: false };
          if (e.status === "IN_TRANSIT") return { ...e, completed: true, current: true, timestamp: nowIso };
        } else if (newStatus === "DELIVERED") {
          if (e.status === "DELIVERED") return { ...e, completed: true, current: true, timestamp: nowIso };
          return { ...e, completed: true, current: false };
        }
        return e;
      });
      updates.trackingEvents = updatedEvents;

      await orderDocRef.update(updates);

      // Sync to store subcollections
      const targetStoreIds = Array.from(
        new Set([existingOrder.store?.id, ...(existingOrder.storeIds || [])].filter(Boolean))
      );
      for (const sId of targetStoreIds) {
        if (sId && sId !== "sellora-official") {
          try {
            await db.collection("stores").doc(sId).collection("orders").doc(id).update(updates);
          } catch {
            // ignore
          }
        }
      }

      const finalOrder: Order = { ...existingOrder, ...updates };

      // Dispatch status update email notification (non-blocking)
      sendOrderStatusUpdateEmail(
        finalOrder,
        newStatus,
        newStatus === "IN_TRANSIT"
          ? `Dispatched with ${finalOrder.carrier || "carrier"} (Tracking: ${finalOrder.trackingNumber || "Assigned"})`
          : newStatus === "DELIVERED"
          ? "Package has been delivered to your delivery address"
          : undefined
      ).catch((e) => console.warn("[Sellora Email] Status update notification error:", e));

      return NextResponse.json({ success: true, order: finalOrder }, { status: 200 });
    }

    return NextResponse.json({ error: "Unsupported order action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order in database" }, { status: 500 });
  }
}
