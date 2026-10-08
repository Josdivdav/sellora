import { getAuth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/unread
 * Returns the count of unread messages for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ unreadCount: 0, buyerUnread: 0, merchantUnread: 0 }, { status: 200 });
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ unreadCount: 0, buyerUnread: 0, merchantUnread: 0 }, { status: 200 });
  }

  try {
    let buyerUnread = 0;
    let merchantUnread = 0;

    // Buyer unread
    const buyerSnap = await db
      .collection("conversations")
      .where("buyerId", "==", uid)
      .get();

    buyerSnap.forEach((doc) => {
      const count = doc.data()?.unreadCountBuyer;
      if (typeof count === "number" && count > 0) {
        buyerUnread += count;
      }
    });

    // Merchant unread
    const merchantSnap = await db
      .collection("conversations")
      .where("storeOwnerId", "==", uid)
      .get();

    merchantSnap.forEach((doc) => {
      const count = doc.data()?.unreadCountMerchant;
      if (typeof count === "number" && count > 0) {
        merchantUnread += count;
      }
    });

    return NextResponse.json({
      unreadCount: buyerUnread + merchantUnread,
      buyerUnread,
      merchantUnread,
    });
  } catch (error) {
    console.error("Error computing unread count:", error);
    return NextResponse.json({ unreadCount: 0, buyerUnread: 0, merchantUnread: 0 }, { status: 200 });
  }
}
