import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Conversation } from "@/types/chat";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/conversations
 * Returns conversations for the authenticated user as buyer or merchant.
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json(
      { error: "Unauthorized: You must have an account to view messages" },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in GET /api/chat/conversations:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role"); // "buyer" | "merchant" | null

  try {
    const conversationsMap = new Map<string, Conversation>();

    // 1. Fetch conversations where user is buyer
    if (!role || role === "buyer") {
      const buyerSnap = await db
        .collection("conversations")
        .where("buyerId", "==", uid)
        .get();

      buyerSnap.forEach((doc) => {
        conversationsMap.set(doc.id, { id: doc.id, ...doc.data() } as Conversation);
      });
    }

    // 2. Fetch conversations where user is merchant
    if (!role || role === "merchant") {
      const merchantSnap = await db
        .collection("conversations")
        .where("storeOwnerId", "==", uid)
        .get();

      merchantSnap.forEach((doc) => {
        conversationsMap.set(doc.id, { id: doc.id, ...doc.data() } as Conversation);
      });

      // Also check by storeId
      const storeIdSnap = await db
        .collection("conversations")
        .where("storeId", "==", uid)
        .get();

      storeIdSnap.forEach((doc) => {
        if (!conversationsMap.has(doc.id)) {
          conversationsMap.set(doc.id, { id: doc.id, ...doc.data() } as Conversation);
        }
      });
    }

    const conversations = Array.from(conversationsMap.values());
    // Sort by latest message / update
    conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessageTimestamp || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastMessageTimestamp || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, conversations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

/**
 * POST /api/chat/conversations
 * Finds or creates a conversation between the authenticated buyer and a store.
 * Buyers MUST be authenticated.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json(
      { error: "Unauthorized: You must have an account before sending a message to a seller." },
      { status: 401 }
    );
  }

  let uid: string;
  let buyerEmail: string | undefined;
  let buyerName: string;
  let buyerPhoto: string | undefined;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    buyerEmail = decoded.email;
    buyerName = decoded.name || decoded.email?.split("@")[0] || "Buyer";
    buyerPhoto = decoded.picture;
  } catch (error) {
    console.error("Invalid token in POST /api/chat/conversations:", error);
    return NextResponse.json(
      { error: "Unauthorized: Please sign in or create an account to message this seller." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { storeId, storeName, storeSlug, storeLogo, storeOwnerId: rawOwnerId, product } = body || {};

    if (!storeId || !storeName) {
      return NextResponse.json({ error: "Store ID and Store Name are required" }, { status: 400 });
    }

    // Resolve storeOwnerId if not provided directly
    let storeOwnerId = rawOwnerId || storeId;
    if (!rawOwnerId) {
      try {
        const storeDoc = await db.collection("stores").doc(storeId).get();
        if (storeDoc.exists) {
          const sData = storeDoc.data();
          storeOwnerId = sData?.ownerId || sData?.userId || storeId;
        }
      } catch {
        // Fallback to storeId
      }
    }

    // Prevent seller from starting conversation with own store
    if (uid === storeOwnerId || uid === storeId) {
      return NextResponse.json(
        { error: "You cannot message your own store." },
        { status: 400 }
      );
    }

    // Check if an existing conversation exists between this buyer and store
    const existingSnap = await db
      .collection("conversations")
      .where("buyerId", "==", uid)
      .where("storeId", "==", storeId)
      .limit(1)
      .get();

    const nowIso = new Date().toISOString();

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      const conversationId = doc.id;
      const existingData = doc.data() as Conversation;

      // Update product context if a new product was clicked
      const updates: Partial<Conversation> = {
        updatedAt: nowIso,
      };
      if (product && product.id) {
        updates.product = {
          id: String(product.id),
          name: String(product.name),
          image: product.image ? String(product.image) : undefined,
          price: product.price ? Number(product.price) : undefined,
          slug: product.slug ? String(product.slug) : undefined,
        };
      }

      await doc.ref.update(updates);
      return NextResponse.json(
        { success: true, conversation: { ...existingData, ...updates, id: conversationId } },
        { status: 200 }
      );
    }

    // Create a new conversation document
    const conversationRef = db.collection("conversations").doc();
    const newConversation: Conversation = {
      id: conversationRef.id,
      buyerId: uid,
      buyerName,
      buyerEmail,
      buyerPhoto,
      storeId: String(storeId),
      storeName: String(storeName),
      storeSlug: String(storeSlug || storeId),
      storeLogo: storeLogo ? String(storeLogo) : undefined,
      storeOwnerId: String(storeOwnerId),
      product: product && product.id
        ? {
            id: String(product.id),
            name: String(product.name),
            image: product.image ? String(product.image) : undefined,
            price: product.price ? Number(product.price) : undefined,
            slug: product.slug ? String(product.slug) : undefined,
          }
        : undefined,
      unreadCountBuyer: 0,
      unreadCountMerchant: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await conversationRef.set(newConversation);

    return NextResponse.json({ success: true, conversation: newConversation }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json({ error: "Failed to initiate conversation" }, { status: 500 });
  }
}
