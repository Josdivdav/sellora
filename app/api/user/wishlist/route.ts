import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/wishlist
 * Returns the authenticated user's wishlist product IDs from FastDB.
 */
export async function GET(request: NextRequest) {
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
    console.error("Invalid token in GET /api/user/wishlist:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    const snap = await userDocRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: true, wishlist: [] }, { status: 200 });
    }

    const data = snap.data();
    const wishlist: string[] = Array.isArray(data?.wishlist) ? data.wishlist : [];

    return NextResponse.json({ success: true, wishlist }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wishlist from FastDB:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist from database" }, { status: 500 });
  }
}

/**
 * POST /api/user/wishlist
 * Toggles or updates a product in the user's wishlist in FastDB.
 */
export async function POST(request: NextRequest) {
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
    console.error("Invalid token in POST /api/user/wishlist:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, action = "toggle" } = body || {};

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const userDocRef = db.collection("users").doc(uid);
    const snap = await userDocRef.get();
    let currentWishlist: string[] = [];

    if (snap.exists) {
      const data = snap.data();
      if (Array.isArray(data?.wishlist)) {
        currentWishlist = [...data.wishlist];
      }
    }

    if (action === "add") {
      if (!currentWishlist.includes(productId)) {
        currentWishlist.push(productId);
      }
    } else if (action === "remove") {
      currentWishlist = currentWishlist.filter((id) => id !== productId);
    } else {
      // toggle
      if (currentWishlist.includes(productId)) {
        currentWishlist = currentWishlist.filter((id) => id !== productId);
      } else {
        currentWishlist.push(productId);
      }
    }

    await userDocRef.set({ wishlist: currentWishlist, updatedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({
      success: true,
      wishlist: currentWishlist,
      isWishlisted: currentWishlist.includes(productId),
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating wishlist in FastDB:", error);
    return NextResponse.json({ error: "Failed to update wishlist in database" }, { status: 500 });
  }
}
