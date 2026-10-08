import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Order, TrackingEvent } from "@/types/order";
import { sendOrderStatusUpdateEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/store/orders
 * Returns all customer orders placed for the authenticated merchant's store from FastDB.
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in GET /api/user/store/orders:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
  }

  try {
    const storeRef = db.collection("stores").doc(uid);
    const storeSnap = await storeRef.get();

    if (!storeSnap.exists) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const storeData = storeSnap.data() || {};
    const storeName = storeData.name || "";

    const ordersMap = new Map<string, Order>();

    // 1. Fetch from merchant's dedicated orders subcollection: stores/{uid}/orders
    try {
      const subOrdersSnap = await storeRef.collection("orders").get();
      subOrdersSnap.forEach((doc) => {
        ordersMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
      });
    } catch (err) {
      console.warn("Could not query store subcollection orders:", err);
    }

    // 2. Fetch from root orders collection where store.id == uid
    try {
      const rootStoreSnap = await db
        .collection("orders")
        .where("store.id", "==", uid)
        .get();
      rootStoreSnap.forEach((doc) => {
        if (!ordersMap.has(doc.id)) {
          ordersMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
        }
      });
    } catch (err) {
      console.warn("Could not query orders by store.id:", err);
    }

    // 3. Fetch from root orders collection where storeIds array contains uid
    try {
      const rootArraySnap = await db
        .collection("orders")
        .where("storeIds", "array-contains", uid)
        .get();
      rootArraySnap.forEach((doc) => {
        if (!ordersMap.has(doc.id)) {
          ordersMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
        }
      });
    } catch (err) {
      console.warn("Could not query orders by storeIds array:", err);
    }

    // Convert map to array and sort newest first
    const orders: Order[] = Array.from(ordersMap.values());
    orders.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, orders, total: orders.length }, { status: 200 });
  } catch (error) {
    console.error("Error fetching merchant orders from FastDB:", error);
    return NextResponse.json({ error: "Failed to fetch customer orders from database" }, { status: 500 });
  }
}

/**
 * PATCH /api/user/store/orders
 * Updates an order status, carrier, or tracking number by the merchant.
 */
export async function PATCH(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in PATCH /api/user/store/orders:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status, carrier, trackingNumber, reason, paymentStatus } = body || {};

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const orderDocRef = db.collection("orders").doc(orderId);
    const snap = await orderDocRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const existingOrder = snap.data() as Order & { userId: string; storeIds?: string[] };
    const isMerchant =
      existingOrder.store?.id === uid ||
      (Array.isArray(existingOrder.storeIds) && existingOrder.storeIds.includes(uid)) ||
      (Array.isArray(existingOrder.items) && existingOrder.items.some((it) => it.storeId === uid));

    if (!isMerchant) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to update this order" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<Order> = {};

    if (carrier) updates.carrier = carrier;
    if (trackingNumber) updates.trackingNumber = trackingNumber;

    if (paymentStatus) {
      updates.payment = {
        ...existingOrder.payment,
        status: paymentStatus,
      };
    }

    if (status) {
      updates.status = status;
      if (status === "DELIVERED") {
        updates.deliveredAt = nowIso;
      }
      if (status === "CANCELLED") {
        updates.cancelledAt = nowIso;
        updates.cancellationReason = reason || "Cancelled by merchant";
        updates.payment = {
          ...existingOrder.payment,
          status: "REFUNDED",
        };
      }

      // Advance tracking events
      const trackingEvents: TrackingEvent[] = (existingOrder.trackingEvents || []).map((e) => {
        if (status === "IN_TRANSIT") {
          if (e.status === "ORDER_PLACED" || e.status === "PROCESSING") return { ...e, completed: true, current: false };
          if (e.status === "IN_TRANSIT") return { ...e, completed: true, current: true, timestamp: nowIso };
        } else if (status === "DELIVERED") {
          if (e.status === "DELIVERED") return { ...e, completed: true, current: true, timestamp: nowIso };
          return { ...e, completed: true, current: false };
        }
        return e;
      });

      if (status === "CANCELLED") {
        trackingEvents.push({
          status: "CANCELLED",
          title: "Order Cancelled by Merchant",
          description: reason || "Merchant was unable to fulfill order.",
          location: existingOrder.store?.name || "Merchant Store",
          timestamp: nowIso,
          completed: true,
          current: true,
        });
      }

      updates.trackingEvents = trackingEvents;
    }

    await orderDocRef.update(updates);

    // Also update merchant's store subcollection
    const storeSubRef = db.collection("stores").doc(uid).collection("orders").doc(orderId);
    await storeSubRef.set(updates, { merge: true });

    const updatedOrder: Order = { ...existingOrder, ...updates };

    // Dispatch status update email notification to customer (non-blocking)
    if (status) {
      sendOrderStatusUpdateEmail(
        updatedOrder,
        status,
        carrier ? `Carrier: ${carrier}` : undefined
      ).catch((e) =>
        console.warn("[Sellora Email] Status update notification error:", e)
      );
    }

    return NextResponse.json({ success: true, order: updatedOrder }, { status: 200 });
  } catch (error) {
    console.error("Error in PATCH /api/user/store/orders:", error);
    return NextResponse.json({ error: "Failed to update order status in database" }, { status: 500 });
  }
}
