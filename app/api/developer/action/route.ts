import { NextResponse, NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateStoreCache } from "@/lib/getStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const devKey = request.headers.get("x-developer-key");
  const configuredPasscode = process.env.DEVELOPER_PASSCODE || process.env.DEV_PASSCODE || "sellora-dev-2026";
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "joshuadivine985@gmail.com").toLowerCase().trim();
  const devCookie = request.cookies.get("sellora_dev_auth")?.value;

  let isAuthorized = false;

  if (devKey && devKey.trim() === configuredPasscode) {
    isAuthorized = true;
  }

  if (!isAuthorized && devCookie === "1") {
    isAuthorized = true;
  }

  if (!isAuthorized && authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
      const email = (decoded.email || "").toLowerCase().trim();
      if (email === adminEmail || email === "joshuadivine985@gmail.com") {
        isAuthorized = true;
      }
    } catch {
      // Token verification failed
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case "TOGGLE_STORE_VERIFIED": {
        const { storeId, isVerified } = payload;
        if (!storeId) {
          return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
        }
        await db.collection("stores").doc(storeId).set(
          {
            isVerified: Boolean(isVerified),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        invalidateStoreCache(storeId);
        return NextResponse.json({
          success: true,
          message: `Store verification set to ${Boolean(isVerified)}`,
        });
      }

      case "TOGGLE_STORE_PREMIUM": {
        const { storeId, isPremium } = payload;
        if (!storeId) {
          return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
        }
        await db.collection("stores").doc(storeId).set(
          {
            isPremium: Boolean(isPremium),
            plan: isPremium ? "Premium" : "Starter",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        invalidateStoreCache(storeId);
        return NextResponse.json({
          success: true,
          message: `Store plan set to ${isPremium ? "Premium" : "Starter"}`,
        });
      }

      case "UPDATE_ORDER_STATUS": {
        const { orderId, status } = payload;
        if (!orderId || !status) {
          return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
        }
        await db.collection("orders").doc(orderId).set(
          {
            status,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return NextResponse.json({
          success: true,
          message: `Order #${orderId} status updated to ${status}`,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Developer Action API] Error:", error);
    return NextResponse.json({ error: error?.message || "Action failed" }, { status: 500 });
  }
}
