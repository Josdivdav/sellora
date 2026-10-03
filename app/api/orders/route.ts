import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Order, OrderItem, ShippingAddress, PaymentDetails } from "@/types/order";
import {
  sendOrderConfirmationEmail,
  sendMerchantNewOrderAlert,
  sendAdminNewOrderAlert,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders
 * Returns all orders belonging to the authenticated user from Firestore.
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
    console.error("Invalid token in GET /api/orders:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
  }

  try {
    const ordersSnap = await db
      .collection("orders")
      .where("userId", "==", uid)
      .get();

    const orders: Order[] = [];
    ordersSnap.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });

    // Sort newest orders first
    orders.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, orders, total: orders.length }, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders from Firestore:", error);
    return NextResponse.json({ error: "Failed to fetch orders from database" }, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Creates a new order in Firestore database with full validation and sanitation.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized: Please sign in to place an order" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch (error) {
    console.error("Invalid token in POST /api/orders:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid authentication session" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Order items cannot be empty" }, { status: 400 });
    }

    const items: OrderItem[] = body.items.map((item: any) => {
      const it: OrderItem = {
        productId: String(item.productId || item.id || `prod_${Date.now()}`),
        name: String(item.name || "Product"),
        slug: String(item.slug || ""),
        image: String(item.image || (Array.isArray(item.images) ? item.images[0] : "") || "/favico.png"),
        price: Math.max(0, Number(item.price) || 0),
        originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
        quantity: Math.max(1, Number(item.quantity) || 1),
        storeName: String(item.storeName || item.author || "Sellora Official Store"),
        category: String(item.category || "General"),
      };
      if (item.variant) it.variant = String(item.variant);
      if (item.storeId) it.storeId = String(item.storeId);
      return it;
    });

    const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const shippingFee = body.deliveryMethod === "express" ? 2500 : 0;
    const discount = Math.max(0, Number(body.discount) || 0);
    const tax = 0;
    const total = Math.max(0, subtotal + shippingFee - discount + tax);

    const now = new Date();
    const nowIso = now.toISOString();
    const deliveryDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const deliveryIso = deliveryDate.toISOString();

    const orderId = String(body.id || `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = String(body.orderNumber || `ORD-${randomSuffix}`);
    const trackingNumber = `SEL-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const firstItem = items[0];
    const rawStore = body.store || {};
    const storeInfo: Record<string, any> = {
      id: String(rawStore.id || firstItem?.storeId || "sellora-store"),
      name: String(rawStore.name || firstItem?.storeName || "Sellora Official Store"),
      isVerified: Boolean(rawStore.isVerified ?? true),
    };
    if (rawStore.phone) storeInfo.phone = String(rawStore.phone);
    if (rawStore.whatsapp) storeInfo.whatsapp = String(rawStore.whatsapp);
    if (rawStore.bankDetails && typeof rawStore.bankDetails === "object") {
      storeInfo.bankDetails = {
        bankName: String(rawStore.bankDetails.bankName || ""),
        accountNumber: String(rawStore.bankDetails.accountNumber || ""),
        accountName: String(rawStore.bankDetails.accountName || ""),
      };
    }

    const shippingAddress: ShippingAddress = {
      fullName: String(body.shippingAddress?.fullName || body.customerName || "Customer"),
      phone: String(body.shippingAddress?.phone || body.phone || "+234 800 000 0000"),
      street: String(body.shippingAddress?.street || body.street || "Delivery Address"),
      city: String(body.shippingAddress?.city || body.city || "Lagos"),
      state: String(body.shippingAddress?.state || body.state || "Lagos"),
      postalCode: String(body.shippingAddress?.postalCode || body.postalCode || "101241"),
      country: "Nigeria",
    };

    const paymentMethod = String(body.payment?.method || "Cash / POS on Delivery (Pay on Arrival)");
    const isTransfer = paymentMethod.toLowerCase().includes("transfer");
    const payment: PaymentDetails = {
      method: paymentMethod,
      status: String(body.payment?.status || (isTransfer ? "PENDING" : "PAID")) as "PAID" | "PENDING",
      transactionId: String(
        body.payment?.transactionId ||
        `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      ),
      cardLast4: String(body.payment?.cardLast4 || "4242"),
    };

    const trackingEvents = [
      {
        status: "ORDER_PLACED" as const,
        title: "Order Placed & Verified",
        description: isTransfer
          ? "Direct bank transfer order initiated. Awaiting confirmation by seller."
          : "Order verified. Merchant notified to prepare shipment package.",
        location: "Sellora Order Processing Center",
        timestamp: nowIso,
        completed: true,
        current: true,
      },
      {
        status: "PROCESSING" as const,
        title: "Merchant Packaging Items",
        description: "Merchant is inspecting items and sealing package.",
        location: storeInfo.name,
        timestamp: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        completed: false,
      },
      {
        status: "IN_TRANSIT" as const,
        title: "Dispatched with Carrier",
        description: "Carrier picked up shipment for transit to local destination hub.",
        location: "Regional Sorting Facility",
        timestamp: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
      },
      {
        status: "DELIVERED" as const,
        title: "Package Delivered",
        description: "Delivered to buyer shipping address.",
        location: shippingAddress.city || "Customer Address",
        timestamp: deliveryIso,
        completed: false,
      },
    ];

    const storeIds = Array.from(
      new Set(
        [storeInfo.id, ...items.map((it) => it.storeId)].filter(
          (id): id is string => Boolean(id) && id !== "sellora-official" && id !== "sellora-store"
        )
      )
    );

    const orderDocData: Order & { userId: string; customerEmail: string; storeIds: string[] } = {
      id: orderId,
      orderNumber,
      userId: uid,
      customerEmail: email || "",
      status: "PROCESSING",
      createdAt: nowIso,
      estimatedDelivery: deliveryIso,
      store: storeInfo as any,
      items,
      pricing: {
        subtotal,
        shippingFee,
        discount,
        tax,
        total,
        currency: "NGN",
      },
      shippingAddress,
      shippingMethod: String(
        body.shippingMethod ||
        (body.deliveryMethod === "express" ? "Sellora Express Delivery (Priority)" : "Sellora Standard Delivery")
      ),
      trackingNumber,
      carrier: String(body.carrier || "GIG Logistics"),
      carrierPhone: "+234 1 800 735 567",
      payment,
      trackingEvents,
      notes: String(body.notes || body.deliveryNotes || ""),
      storeIds,
    };

    // 1. Write to root orders collection
    const orderDocRef = db.collection("orders").doc(orderId);
    await orderDocRef.set(orderDocData);

    // 2. Also save to participating stores' subcollections
    if (storeIds.length > 0) {
      await Promise.allSettled(
        storeIds.map(async (sId) => {
          try {
            await db
              .collection("stores")
              .doc(sId)
              .collection("orders")
              .doc(orderId)
              .set(orderDocData);
          } catch (storeOrderErr) {
            console.warn(`Could not write order ${orderId} to store ${sId}:`, storeOrderErr);
          }
        })
      );
    } else if (storeInfo.id && storeInfo.id !== "sellora-official" && storeInfo.id !== "sellora-store") {
      try {
        await db
          .collection("stores")
          .doc(storeInfo.id)
          .collection("orders")
          .doc(orderId)
          .set(orderDocData);
      } catch (storeOrderErr) {
        console.warn("Could not write order to store subcollection:", storeOrderErr);
      }
    }

    // 3. Dispatch automated email notifications via Gmail SMTP (non-blocking)
    (async () => {
      try {
        // Send Buyer Confirmation Email
        await sendOrderConfirmationEmail(orderDocData, {
          bankDetails: body.bankDetails || undefined,
          whatsappPhone: body.whatsappPhone || undefined,
        });

        // Send Merchant Alert Emails to participating stores
        const targetStoreIds = storeIds.length > 0 ? storeIds : (storeInfo.id ? [storeInfo.id] : []);
        for (const sId of targetStoreIds) {
          try {
            const storeSnap = await db.collection("stores").doc(sId).get();
            const storeData = storeSnap.data();
            let merchantEmail = storeData?.email;

            // If store doc doesn't have an email, look up owner user doc
            if (!merchantEmail) {
              const userSnap = await db.collection("users").doc(sId).get();
              merchantEmail = userSnap.data()?.email;
            }

            if (merchantEmail) {
              const merchantItems = orderDocData.items.filter(
                (it) => it.storeId === sId || (!it.storeId && sId === storeInfo.id)
              );
              await sendMerchantNewOrderAlert(
                orderDocData,
                merchantEmail,
                storeData?.name || storeInfo.name || "Your Store",
                { merchantItems }
              );
            }
          } catch (mErr) {
            console.warn(`[Sellora Email] Could not notify merchant for store ${sId}:`, mErr);
          }
        }

        // Send Platform Admin Notification
        await sendAdminNewOrderAlert(orderDocData);
      } catch (emailErr) {
        console.warn("[Sellora Email] Order notification error:", emailErr);
      }
    })();

    return NextResponse.json({ success: true, order: orderDocData }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order in Firestore:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Failed to place order in database" },
      { status: 500 }
    );
  }
}
