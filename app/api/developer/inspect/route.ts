import { NextResponse, NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { getAllProducts } from "@/lib/getProduct";
import { isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

interface DeveloperActivity {
  id: string;
  type: "USER_SIGNUP" | "STORE_CREATED" | "ORDER_PLACED" | "ORDER_STATUS" | "CHAT_INQUIRY" | "REFERRAL_EARNED";
  title: string;
  subtitle: string;
  time: string;
  badge?: string;
  meta?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const devKey = request.headers.get("x-developer-key") || request.nextUrl.searchParams.get("key");
  const configuredPasscode = process.env.DEVELOPER_PASSCODE || process.env.DEV_PASSCODE || "sellora-dev-2026";
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "joshuadivine985@gmail.com").toLowerCase().trim();
  const devCookie = request.cookies.get("sellora_dev_auth")?.value;

  let isAuthorized = false;
  let authorizedAs: "token" | "key" | "cookie" | null = null;
  let authenticatedEmail: string | null = null;

  // 1. Check Passcode / Dev Key
  if (devKey && devKey.trim() === configuredPasscode) {
    isAuthorized = true;
    authorizedAs = "key";
    authenticatedEmail = "Developer Key Authenticated";
  }

  // 2. Check Cookie
  if (!isAuthorized && devCookie === "1") {
    isAuthorized = true;
    authorizedAs = "cookie";
    authenticatedEmail = "Developer Secret Session";
  }

  // 3. Check Firebase ID Token (Admin Email)
  if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await getAuth().verifyIdToken(token);
      authenticatedEmail = (decoded.email || "").toLowerCase().trim();
      if (authenticatedEmail === adminEmail || authenticatedEmail === "joshuadivine985@gmail.com") {
        isAuthorized = true;
        authorizedAs = "token";
      }
    } catch (err) {
      console.warn("[Developer Inspect API] Token verification failed:", err);
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    // 1. Fetch Users
    const usersMap = new Map<string, any>();
    try {
      const usersSnap = await db.collection("users").get();
      usersSnap.forEach((doc) => {
        const d = doc.data();
        let createdAtStr: string | null = null;
        if (d.createdAt) {
          createdAtStr = d.createdAt.toDate ? d.createdAt.toDate().toISOString() : String(d.createdAt);
        }
        usersMap.set(doc.id, {
          uid: doc.id,
          email: d.email || "No email",
          displayName: d.displayName || "Sellora User",
          photoURL: d.photoURL || null,
          has_store: Boolean(d.has_store),
          createdAt: createdAtStr,
          cartCount: Array.isArray(d.cart) ? d.cart.length : 0,
          wishlistCount: Array.isArray(d.wishlist) ? d.wishlist.length : 0,
          updatedAt: d.updatedAt || null,
        });
      });
    } catch (err) {
      console.warn("[Developer API] Error reading users collection:", err);
    }

    const usersList = Array.from(usersMap.values()).sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    // 2. Fetch Stores (Directly from FastDB)
    const storesMap = new Map<string, any>();
    try {
      const storesSnap = await db.collection("stores").get();
      storesSnap.forEach((doc) => {
        const d = doc.data();
        storesMap.set(doc.id, {
          id: doc.id,
          name: d.name || "Untitled Store",
          slug: d.slug || doc.id,
          category: d.category || "General",
          description: d.description || "",
          ownerId: d.ownerId || doc.id,
          ownerEmail: d.email || usersMap.get(d.ownerId || doc.id)?.email || null,
          isVerified: Boolean(d.isVerified),
          isPremium: Boolean(d.isPremium),
          plan: d.plan || (d.isPremium ? "Premium" : "Starter"),
          phone: d.phone || d.whatsapp || "",
          whatsapp: d.whatsapp || d.phone || "",
          location: d.location || "Nigeria",
          logo: d.logo || null,
          banner: d.banner || null,
          rating: d.rating || 5,
          reviewCount: d.reviewCount || 0,
          joinedDate: d.joinedDate || d.createdAt || d.updatedAt || new Date().toISOString(),
          productCount: Array.isArray(d.products) ? d.products.length : (d.productsCount || 0),
          source: "FastDB Registered",
        });
      });
    } catch (err) {
      console.warn("[Developer API] Error reading stores collection:", err);
    }

    const storesList = Array.from(storesMap.values()).sort((a, b) => {
      const tA = a.joinedDate ? new Date(a.joinedDate).getTime() : 0;
      const tB = b.joinedDate ? new Date(b.joinedDate).getTime() : 0;
      return tB - tA;
    });

    // 3. Fetch Orders (Directly from FastDB)
    const ordersMap = new Map<string, any>();
    try {
      const ordersSnap = await db.collection("orders").get();
      ordersSnap.forEach((doc) => {
        const d = doc.data();
        ordersMap.set(doc.id, {
          id: doc.id,
          orderNumber: d.orderNumber || doc.id.slice(0, 8),
          trackingNumber: d.trackingNumber || `SEL-${doc.id.slice(0, 8)}`,
          userId: d.userId || "",
          customerName: d.shippingAddress?.fullName || d.customer?.name || "Customer",
          customerEmail: d.shippingAddress?.email || d.customer?.email || usersMap.get(d.userId)?.email || "",
          customerPhone: d.shippingAddress?.phone || d.customer?.phone || "",
          storeName: d.items?.[0]?.storeName || d.storeName || "Marketplace Store",
          storeId: d.storeId || d.storeIds?.[0] || "",
          total: Number(d.pricing?.total ?? d.total ?? 0),
          status: d.status || "PROCESSING",
          paymentStatus: d.payment?.status || "PENDING",
          paymentMethod: d.payment?.method || "WHATSAPP_CONFIRMATION",
          itemCount: Array.isArray(d.items) ? d.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) : 1,
          createdAt: d.createdAt || new Date().toISOString(),
          source: "FastDB Order",
        });
      });
    } catch (err) {
      console.warn("[Developer API] Error reading orders collection:", err);
    }

    const ordersList = Array.from(ordersMap.values()).sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    // 4. Products & Categories
    let productsCount = 0;
    let categoriesList: string[] = [];
    try {
      const prodData = await getAllProducts();
      productsCount = prodData.products?.length || 0;
      categoriesList = prodData.categories || [];
    } catch (err) {
      console.warn("[Developer API] Error getting products:", err);
    }

    // 5. Chat Conversations
    const convsList: any[] = [];
    try {
      const convsSnap = await db.collection("conversations").get();
      convsSnap.forEach((doc) => {
        const d = doc.data();
        convsList.push({
          id: doc.id,
          buyerName: d.buyerName || "Buyer",
          buyerEmail: d.buyerEmail || "",
          buyerId: d.buyerId || "",
          storeName: d.storeName || "Store",
          storeId: d.storeId || "",
          productName: d.product?.name || null,
          lastMessage: d.lastMessage || "Started inquiry",
          lastMessageTimestamp: d.lastMessageTimestamp || d.createdAt || null,
          unreadCountMerchant: d.unreadCountMerchant || 0,
          unreadCountBuyer: d.unreadCountBuyer || 0,
        });
      });
    } catch (err) {
      console.warn("[Developer API] Error reading conversations collection:", err);
    }

    convsList.sort((a, b) => {
      const tA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
      const tB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
      return tB - tA;
    });

    // 6. Referrals
    const referralsList: any[] = [];
    try {
      const refSnap = await db.collection("referrals").get();
      refSnap.forEach((doc) => {
        const d = doc.data();
        referralsList.push({
          id: doc.id,
          referrerName: d.referrerName || "Merchant",
          referrerSlug: d.referrerSlug || "",
          referredStoreName: d.referredStoreName || "New Merchant",
          status: d.status || "joined",
          rewardAmount: d.rewardAmount || 1000,
          createdAt: d.createdAt || null,
        });
      });
    } catch (err) {
      console.warn("[Developer API] Error reading referrals collection:", err);
    }

    // 7. Consolidated Activity Timeline
    const activities: DeveloperActivity[] = [];

    // Add recent signups
    usersList.forEach((u) => {
      if (u.createdAt) {
        activities.push({
          id: `act_user_${u.uid}`,
          type: "USER_SIGNUP",
          title: `New User: ${u.displayName}`,
          subtitle: `${u.email}${u.has_store ? " • Registered Store Owner" : " • Shopper"}`,
          time: u.createdAt,
          badge: u.has_store ? "Store Owner" : "Shopper",
          meta: { uid: u.uid },
        });
      }
    });

    // Add recent stores
    storesList.forEach((s) => {
      if (s.joinedDate) {
        activities.push({
          id: `act_store_${s.id}`,
          type: "STORE_CREATED",
          title: `Store Created: ${s.name}`,
          subtitle: `Category: ${s.category} • Location: ${s.location}`,
          time: s.joinedDate,
          badge: s.isVerified ? "Verified" : "Unverified",
          meta: { storeId: s.id, slug: s.slug },
        });
      }
    });

    // Add recent orders
    ordersList.forEach((o) => {
      if (o.createdAt) {
        activities.push({
          id: `act_order_${o.id}`,
          type: "ORDER_PLACED",
          title: `Order #${o.orderNumber}: ₦${o.total.toLocaleString()}`,
          subtitle: `${o.customerName} ordered from ${o.storeName}`,
          time: o.createdAt,
          badge: o.status,
          meta: { orderId: o.id, status: o.status, total: o.total },
        });
      }
    });

    // Add recent inquiries
    convsList.forEach((c) => {
      if (c.lastMessageTimestamp) {
        activities.push({
          id: `act_chat_${c.id}`,
          type: "CHAT_INQUIRY",
          title: `Customer Inquiry: ${c.buyerName}`,
          subtitle: `Inquired with ${c.storeName}: "${c.lastMessage}"`,
          time: c.lastMessageTimestamp,
          badge: "Message",
          meta: { convId: c.id },
        });
      }
    });

    // Sort activities chronological descending
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 8. Financials & Metrics Calculation
    const totalGMV = ordersList.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const deliveredGMV = ordersList
      .filter((o) => o.status === "DELIVERED")
      .reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const ordersByStatus = {
      PROCESSING: ordersList.filter((o) => o.status === "PROCESSING").length,
      IN_TRANSIT: ordersList.filter((o) => o.status === "IN_TRANSIT").length,
      DELIVERED: ordersList.filter((o) => o.status === "DELIVERED").length,
      CANCELLED: ordersList.filter((o) => o.status === "CANCELLED").length,
    };

    const usersWithStoreCount = usersList.filter((u) => u.has_store).length;
    const pureBuyersCount = usersList.length - usersWithStoreCount;

    return NextResponse.json({
      success: true,
      authorizedAs,
      authenticatedEmail,
      summary: {
        totalUsers: usersList.length,
        usersWithStore: usersWithStoreCount,
        pureBuyers: pureBuyersCount,
        totalStores: storesList.length,
        verifiedStores: storesList.filter((s) => s.isVerified).length,
        premiumStores: storesList.filter((s) => s.isPremium || s.plan === "Premium").length,
        totalProducts: productsCount,
        totalOrders: ordersList.length,
        totalGMV,
        deliveredGMV,
        ordersByStatus,
        totalConversations: convsList.length,
        totalReferrals: referralsList.length,
      },
      systemHealth: {
        firebaseStatus: "CONNECTED",
        emailEngineConfigured: isEmailConfigured(),
        environment: process.env.NODE_ENV || "development",
        serverTimestamp: new Date().toISOString(),
        adminEmail,
      },
      users: usersList,
      stores: storesList,
      orders: ordersList,
      conversations: convsList,
      referrals: referralsList,
      categories: categoriesList,
      recentActivities: activities.slice(0, 50),
    });
  } catch (error: any) {
    console.error("[Developer Inspect API] General error:", error);
    return NextResponse.json(
      {
        error: "Failed to compile developer metrics",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
