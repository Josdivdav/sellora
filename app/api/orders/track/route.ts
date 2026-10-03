import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function maskName(name?: string): string {
  if (!name) return "Customer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/**
 * GET /api/orders/track?code=SEL-xxxxxxxx or ORD-xxxxxx
 * Public endpoint allowing customers to look up order shipment tracking details
 * without requiring account login or exposing sensitive payment information.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code") || searchParams.get("id") || "";
    const code = rawCode.trim();

    if (!code) {
      return NextResponse.json(
        { error: "Tracking number or Order number is required." },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();

    // 1. Search by trackingNumber (e.g. SEL-84920194)
    let orderDoc: any = null;
    const trackQuery = await db
      .collection("orders")
      .where("trackingNumber", "==", upperCode)
      .limit(1)
      .get();

    if (!trackQuery.empty) {
      orderDoc = trackQuery.docs[0];
    } else {
      // 2. Search by orderNumber (e.g. ORD-649201)
      const orderNumQuery = await db
        .collection("orders")
        .where("orderNumber", "==", upperCode)
        .limit(1)
        .get();

      if (!orderNumQuery.empty) {
        orderDoc = orderNumQuery.docs[0];
      } else {
        // 3. Fallback: Lookup direct document ID
        const directDoc = await db.collection("orders").doc(code).get();
        if (directDoc.exists) {
          orderDoc = directDoc;
        }
      }
    }

    if (!orderDoc || !orderDoc.exists) {
      return NextResponse.json(
        {
          error: `No shipment found for "${code}". Please verify your tracking ID or order number and try again.`,
        },
        { status: 404 }
      );
    }

    const data = orderDoc.data();

    // Build safe public response without sensitive customer/bank details
    const publicTracking = {
      id: orderDoc.id,
      orderNumber: data.orderNumber || code,
      trackingNumber: data.trackingNumber || code,
      status: data.status || "PROCESSING",
      carrier: data.carrier || "GIG Logistics",
      carrierPhone: data.carrierPhone || "+234 1 800 735 567",
      shippingMethod: data.shippingMethod || "Sellora Standard Delivery",
      createdAt: data.createdAt,
      estimatedDelivery: data.estimatedDelivery,
      deliveredAt: data.deliveredAt,
      cancelledAt: data.cancelledAt,
      cancellationReason: data.cancellationReason,
      trackingEvents: data.trackingEvents || [],
      destination: {
        city: data.shippingAddress?.city || "Nigeria",
        state: data.shippingAddress?.state || "Lagos",
        recipientName: maskName(data.shippingAddress?.fullName),
      },
      items: (data.items || []).map((it: any) => ({
        name: it.name || "Product",
        quantity: it.quantity || 1,
        image: it.image || "",
        storeName: it.storeName || data.store?.name || "Sellora Store",
      })),
      store: {
        name: data.store?.name || "Sellora Store",
        isVerified: data.store?.isVerified ?? true,
      },
    };

    return NextResponse.json({ success: true, tracking: publicTracking }, { status: 200 });
  } catch (error: any) {
    console.error("Error in public order tracking endpoint:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while looking up tracking info." },
      { status: 500 }
    );
  }
}
