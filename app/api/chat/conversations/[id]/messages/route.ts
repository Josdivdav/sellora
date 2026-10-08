import { getAuth } from "firebase-admin/auth";
import { NextResponse, NextRequest } from "next/server";
import { db, FieldValue } from "@/lib/db";
import type { ChatMessage, Conversation } from "@/types/chat";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chat/conversations/[id]/messages
 * Fetches all messages for this conversation and marks them read for the caller.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json(
      { error: "Unauthorized: Please sign in to read messages" },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    console.error("Invalid token in GET messages:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
  }

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
  }

  try {
    const convRef = db.collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const convData = convSnap.data() as Conversation;
    const isBuyer = convData.buyerId === uid;
    const isMerchant = convData.storeOwnerId === uid || convData.storeId === uid;

    if (!isBuyer && !isMerchant) {
      return NextResponse.json(
        { error: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Fetch messages sorted chronologically
    const messagesSnap = await convRef
      .collection("messages")
      .orderBy("timestamp", "asc")
      .limit(100)
      .get();

    const messages: ChatMessage[] = [];
    const batch = db.batch();
    let hasUnread = false;

    messagesSnap.forEach((doc) => {
      const msg = { id: doc.id, ...doc.data() } as ChatMessage;
      messages.push(msg);

      // If message was sent by other participant and is unread, mark read
      if (!msg.read && msg.senderId !== uid) {
        batch.update(doc.ref, { read: true });
        hasUnread = true;
      }
    });

    // Reset unread count on conversation doc for this user
    if (hasUnread || (isBuyer && convData.unreadCountBuyer > 0) || (isMerchant && convData.unreadCountMerchant > 0)) {
      const resetUpdate = isBuyer
        ? { unreadCountBuyer: 0 }
        : { unreadCountMerchant: 0 };
      batch.update(convRef, resetUpdate);
      await batch.commit();
    }

    return NextResponse.json(
      { success: true, conversation: { ...convData, id: convSnap.id }, messages },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/**
 * POST /api/chat/conversations/[id]/messages
 * Appends a message to the conversation.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!idToken) {
    return NextResponse.json(
      { error: "Unauthorized: You must have an account before sending a message" },
      { status: 401 }
    );
  }

  let uid: string;
  let userName: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    userName = decoded.name || decoded.email?.split("@")[0] || "User";
  } catch (error) {
    console.error("Invalid token in POST message:", error);
    return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
  }

  const { id: conversationId } = await context.params;
  if (!conversationId) {
    return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
  }

  try {
    const convRef = db.collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const convData = convSnap.data() as Conversation;
    const isBuyer = convData.buyerId === uid;
    const isMerchant = convData.storeOwnerId === uid || convData.storeId === uid;

    if (!isBuyer && !isMerchant) {
      return NextResponse.json(
        { error: "Forbidden: You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const text = String(body.text || "").trim();

    if (!text) {
      return NextResponse.json({ error: "Message text cannot be empty" }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: "Message text exceeds 2000 characters limit" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const role: "buyer" | "merchant" = isBuyer ? "buyer" : "merchant";
    const senderDisplayName = isMerchant ? convData.storeName : (convData.buyerName || userName);

    const messageRef = convRef.collection("messages").doc();
    const newMessage: ChatMessage = {
      id: messageRef.id,
      conversationId,
      senderId: uid,
      senderRole: role,
      senderName: senderDisplayName,
      text,
      timestamp: nowIso,
      read: false,
    };

    await messageRef.set(newMessage);

    // Update conversation metadata and increment recipient unread count
    const conversationUpdates: Record<string, any> = {
      lastMessage: text,
      lastMessageTimestamp: nowIso,
      lastSenderId: uid,
      updatedAt: nowIso,
    };

    if (isBuyer) {
      conversationUpdates.unreadCountMerchant = FieldValue.increment(1);
    } else {
      conversationUpdates.unreadCountBuyer = FieldValue.increment(1);
    }

    await convRef.update(conversationUpdates);

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
