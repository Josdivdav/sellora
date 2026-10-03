"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import type { Conversation, ChatMessage, ConversationProduct } from "@/types/chat";

export interface OpenChatOptions {
  storeId: string;
  storeName: string;
  storeSlug?: string;
  storeLogo?: string;
  storeOwnerId?: string;
  product?: ConversationProduct;
}

interface ChatContextType {
  isOpen: boolean;
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  unreadCount: number;
  authPromptOpen: boolean;
  authPromptStore: { name: string; slug?: string } | null;
  openChat: (options: OpenChatOptions) => Promise<void>;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<boolean>;
  closeAuthPrompt: () => void;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auth prompt state when an unauthenticated user tries to message a seller
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptStore, setAuthPromptStore] = useState<{ name: string; slug?: string } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check unread count on mount and when user changes
  const checkUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/chat/unread", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    void checkUnread();
    const interval = setInterval(checkUnread, 15000);
    return () => clearInterval(interval);
  }, [checkUnread]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.conversation) {
          setActiveConversation(data.conversation);
        }
      }
    } catch (err) {
      console.warn("Could not fetch chat messages:", err);
    }
  }, [user]);

  // Polling for live messages when chat window is open
  useEffect(() => {
    if (isOpen && activeConversation?.id) {
      void fetchMessages(activeConversation.id);

      pollIntervalRef.current = setInterval(() => {
        void fetchMessages(activeConversation.id);
      }, 3500);

      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [isOpen, activeConversation?.id, fetchMessages]);

  const openChat = async (options: OpenChatOptions) => {
    // REQUIREMENT: Buyers must have an account before sending a message!
    if (!user) {
      setAuthPromptStore({
        name: options.storeName,
        slug: options.storeSlug,
      });
      setAuthPromptOpen(true);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start conversation");
      }

      const data = await res.json();
      const conversation: Conversation = data.conversation;
      setActiveConversation(conversation);
      await fetchMessages(conversation.id);
    } catch (err) {
      console.error("Error opening chat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  };

  const closeAuthPrompt = () => {
    setAuthPromptOpen(false);
    setAuthPromptStore(null);
  };

  const sendMessage = async (text: string): Promise<boolean> => {
    if (!user || !activeConversation?.id || !text.trim()) return false;
    setIsSending(true);

    const cleanText = text.trim();
    // Optimistic UI update
    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user.uid,
      senderRole: activeConversation.buyerId === user.uid ? "buyer" : "merchant",
      senderName: user.displayName || "You",
      text: cleanText,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chat/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic message with actual message
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? data.message : m))
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to send message:", err);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const refreshConversations = async () => {
    await checkUnread();
    if (activeConversation?.id) {
      await fetchMessages(activeConversation.id);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        activeConversation,
        messages,
        isLoading,
        isSending,
        unreadCount,
        authPromptOpen,
        authPromptStore,
        openChat,
        closeChat,
        sendMessage,
        closeAuthPrompt,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
