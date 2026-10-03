import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";

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
      .where("unreadCountBuyer", ">", 0)
      .get();

    buyerSnap.forEach((doc) => {
      buyerUnread += doc.data()?.unreadCountBuyer || 0;
    });

    // Merchant unread
    const merchantSnap = await db
      .collection("conversations")
      .where("storeOwnerId", "==", uid)
      .where("unreadCountMerchant", ">", 0)
      .get();

    merchantSnap.forEach((doc) => {
      merchantUnread += doc.data()?.unreadCountMerchant || 0;
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
