export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "buyer" | "merchant";
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ConversationProduct {
  id: string;
  name: string;
  image?: string;
  price?: number;
  slug?: string;
}

export interface Conversation {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhoto?: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeLogo?: string;
  storeOwnerId: string;
  product?: ConversationProduct;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  lastSenderId?: string;
  unreadCountBuyer: number;
  unreadCountMerchant: number;
  createdAt: string;
  updatedAt: string;
}
