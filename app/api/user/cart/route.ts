import { getAuth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/cart
 * Retrieves the user's cart from FastDB database.
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
    console.error("Invalid token in GET /api/user/cart:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    const snap = await userDocRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: true, cart: {} }, { status: 200 });
    }

    const data = snap.data();
    const cart: Record<string, number> = data?.cart || {};

    return NextResponse.json({ success: true, cart }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cart from FastDB:", error);
    return NextResponse.json({ error: "Failed to fetch cart from database" }, { status: 500 });
  }
}

/**
 * POST /api/user/cart
 * Updates the user's cart in FastDB database.
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
    console.error("Invalid token in POST /api/user/cart:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userDocRef = db.collection("users").doc(uid);

    let updatedCart: Record<string, number> = {};

    if (body.cart && typeof body.cart === "object") {
      // Direct whole-cart update
      updatedCart = {};
      for (const [prodId, qty] of Object.entries(body.cart)) {
        const numQty = Number(qty);
        if (numQty > 0) {
          updatedCart[prodId] = numQty;
        }
      }
    } else if (body.productId) {
      // Incremental item update
      const snap = await userDocRef.get();
      const existingCart: Record<string, number> = snap.data()?.cart || {};
      const { productId, quantity = 1, action = "add" } = body;

      if (action === "remove") {
        delete existingCart[productId];
      } else if (action === "set") {
        const qtyNum = Number(quantity);
        if (qtyNum > 0) {
          existingCart[productId] = qtyNum;
        } else {
          delete existingCart[productId];
        }
      } else {
        // default add
        existingCart[productId] = (existingCart[productId] || 0) + Number(quantity);
      }
      updatedCart = existingCart;
    }

    await userDocRef.set({ cart: updatedCart, updatedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({ success: true, cart: updatedCart }, { status: 200 });
  } catch (error) {
    console.error("Error updating cart in FastDB:", error);
    return NextResponse.json({ error: "Failed to update cart in database" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/cart
 * Clears the user's cart in FastDB database.
 */
export async function DELETE(request: NextRequest) {
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
    console.error("Invalid token in DELETE /api/user/cart:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    await userDocRef.set({ cart: {}, updatedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({ success: true, cart: {} }, { status: 200 });
  } catch (error) {
    console.error("Error clearing cart in FastDB:", error);
    return NextResponse.json({ error: "Failed to clear cart in database" }, { status: 500 });
  }
}
