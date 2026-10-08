import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface Promotion {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder?: number;
  expiry?: string;
  active: boolean;
  createdAt: string;
}

/**
 * GET /api/user/store/promotions
 * Retrieves all active promotions for the merchant's store from FastDB.
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
    console.error("Invalid token in GET /api/user/store/promotions:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promotionsSnap = await db
      .collection("stores")
      .doc(uid)
      .collection("promotions")
      .get();

    const promotions: Promotion[] = [];
    promotionsSnap.forEach((doc) => {
      promotions.push({ id: doc.id, ...doc.data() } as Promotion);
    });

    promotions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, promotions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching promotions from FastDB:", error);
    return NextResponse.json({ error: "Failed to fetch promotions from database" }, { status: 500 });
  }
}

/**
 * POST /api/user/store/promotions
 * Creates a new promo code for the merchant's store in FastDB.
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
    console.error("Invalid token in POST /api/user/store/promotions:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const code = (body.code || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
    const type = body.type === "fixed" ? "fixed" : "percentage";
    const value = Math.max(0, Number(body.value) || 0);
    const minOrder = body.minOrder ? Math.max(0, Number(body.minOrder)) : 0;
    const expiry = body.expiry || "";

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    if (value <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than zero" }, { status: 400 });
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }

    const promoId = `promo_${code.toLowerCase()}_${Date.now()}`;
    const promoDocRef = db.collection("stores").doc(uid).collection("promotions").doc(promoId);

    const promotion: Promotion = {
      id: promoId,
      code,
      type,
      value,
      minOrder,
      expiry,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await promoDocRef.set(promotion);

    return NextResponse.json({ success: true, promotion }, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion in FastDB:", error);
    return NextResponse.json({ error: "Failed to create promo code in database" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/store/promotions
 * Deletes a promo code from FastDB.
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
    console.error("Invalid token in DELETE /api/user/store/promotions:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Promotion ID is required" }, { status: 400 });
    }

    await db.collection("stores").doc(uid).collection("promotions").doc(id).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting promotion from FastDB:", error);
    return NextResponse.json({ error: "Failed to delete promotion" }, { status: 500 });
  }
}
