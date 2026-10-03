"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./merchant-messages.module.css";
import type { Store } from "@/types/store";
import type { User } from "firebase/auth";
import type { Conversation, ChatMessage } from "@/types/chat";

interface Props {
  store: Store;
  user: User | null;
  onShowToast: (msg: string) => void;
}

const QUICK_REPLIES = [
  "Hello! Yes, this item is in stock and available for immediate dispatch.",
  "We deliver nationwide within 24–48 hours.",
  "Feel free to place your order directly through our store!",
  "What color or size variation would you prefer?",
];

export default function MerchantMessagesTab({ store, user, onShowToast }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch conversations list for store
  const fetchConversations = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/chat/conversations", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const convList: Conversation[] = data.conversations || [];
        setConversations(convList);

        if (isInitial && convList.length > 0 && !selectedConvId) {
          setSelectedConvId(convList[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      if (isInitial) setIsLoadingConvs(false);
    }
  }, [user, selectedConvId]);

  // Initial load
  useEffect(() => {
    void fetchConversations(true);
  }, [fetchConversations]);

  // Periodic poll for conversations list (every 4 seconds)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void fetchConversations(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [user, fetchConversations]);

  // 2. Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    if (!user || !convId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }, [user]);

  // Trigger load when selected conversation changes
  useEffect(() => {
    if (selectedConvId) {
      void fetchMessages(selectedConvId);
      // Also scroll
      setTimeout(scrollToBottom, 200);
    } else {
      setMessages([]);
    }
  }, [selectedConvId, fetchMessages]);

  // Poll active messages
  useEffect(() => {
    if (!user || !selectedConvId) return;
    const interval = setInterval(() => {
      void fetchMessages(selectedConvId);
    }, 3500);
    return () => clearInterval(interval);
  }, [user, selectedConvId, fetchMessages]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // 3. Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConvId || !user || isSending) return;

    setIsSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/chat/conversations/${selectedConvId}/messages`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        setInputText("");
        // Reload messages & conv list immediately
        await fetchMessages(selectedConvId);
        await fetchConversations(false);
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to send message.");
      }
    } catch (err) {
      console.error("Send error:", err);
      onShowToast("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Filtered conversations
  const filteredConvs = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.buyerName?.toLowerCase().includes(q) ||
      c.buyerEmail?.toLowerCase().includes(q) ||
      c.product?.name.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  // Total unread for this merchant
  const totalUnread = conversations.reduce(
    (acc, c) => acc + (c.unreadCountMerchant || 0),
    0
  );

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Customer Inquiries &amp; Messages</h2>
          <p className={styles.subtitle}>
            Direct chat with verified buyers interested in your products.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "#eff6ff", color: "#2b6dff" }}
          >
            <span className="material-icons-round">forum</span>
          </div>
          <div>
            <div className={styles.statValue}>{conversations.length}</div>
            <div className={styles.statLabel}>Active Inquiries</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "#ecfdf5", color: "#10b981" }}
          >
            <span className="material-icons-round">mark_chat_unread</span>
          </div>
          <div>
            <div className={styles.statValue}>{totalUnread}</div>
            <div className={styles.statLabel}>Unread Messages</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "#fdf4ff", color: "#c026d3" }}
          >
            <span className="material-icons-round">shopping_bag</span>
          </div>
          <div>
            <div className={styles.statValue}>
              {conversations.filter((c) => Boolean(c.product)).length}
            </div>
            <div className={styles.statLabel}>Product Discussions</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Chat Container */}
      <div className={styles.chatLayout}>
        {/* Left Column: Conversations List */}
        <aside className={styles.convListPanel}>
          <div className={styles.convSearchWrap}>
            <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
            <input
              type="text"
              className={styles.convSearchInput}
              placeholder="Search inquiries or products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.convItemsScroll}>
            {isLoadingConvs ? (
              <div className={styles.emptyConvList}>
                <span className="material-icons-round" style={{ fontSize: "32px", color: "#cbd5e1" }}>
                  hourglass_empty
                </span>
                <span>Loading conversations...</span>
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className={styles.emptyConvList}>
                <span className="material-icons-round" style={{ fontSize: "36px", color: "#cbd5e1" }}>
                  chat_bubble_outline
                </span>
                <span>No customer messages yet</span>
                <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                  When buyers ask questions about your products, they will appear here.
                </span>
              </div>
            ) : (
              filteredConvs.map((c) => {
                const isActive = c.id === selectedConvId;
                const unread = c.unreadCountMerchant || 0;
                const initial = (c.buyerName || c.buyerEmail || "B")[0].toUpperCase();

                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.convItem} ${isActive ? styles.convItemActive : ""}`}
                    onClick={() => setSelectedConvId(c.id)}
                  >
                    <div className={styles.avatar}>{initial}</div>

                    <div className={styles.convMeta}>
                      <div className={styles.convTopRow}>
                        <span className={styles.buyerName}>
                          {c.buyerName || c.buyerEmail?.split("@")[0] || "Buyer"}
                        </span>
                        <span className={styles.time}>{formatTime(c.lastMessageTimestamp)}</span>
                      </div>

                      {c.product && (
                        <div className={styles.productSnippetRow}>
                          <span className="material-icons-round" style={{ fontSize: "12px" }}>
                            shopping_bag
                          </span>
                          <span>{c.product.name}</span>
                        </div>
                      )}

                      <div className={styles.lastMsgRow}>
                        <p className={styles.lastMsgText}>
                          {c.lastMessage || "Started a conversation"}
                        </p>
                        {unread > 0 && (
                          <span className={styles.unreadBadge}>{unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Chat Thread */}
        <section className={styles.chatPanel}>
          {activeConv ? (
            <>
              {/* Active Conversation Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                  <div className={styles.avatar}>
                    {(activeConv.buyerName || "B")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.chatHeaderName}>
                      {activeConv.buyerName || "Customer"}
                    </div>
                    <div className={styles.chatHeaderStatus}>
                      <span className={styles.statusDot} />
                      <span>Verified Buyer</span>
                    </div>
                  </div>
                </div>

                {/* Attached Product Context Banner */}
                {activeConv.product && (
                  <Link
                    href={`/product/${activeConv.product.id}`}
                    target="_blank"
                    className={styles.productBanner}
                    title="View product details in new tab"
                  >
                    <img
                      src={activeConv.product.image}
                      alt={activeConv.product.name}
                      className={styles.productThumb}
                    />
                    <div className={styles.productInfoWrap}>
                      <div className={styles.productTitle}>
                        {activeConv.product.name}
                      </div>
                      <div className={styles.productPrice}>
                        ₦{(activeConv.product.price ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#94a3b8" }}>
                      open_in_new
                    </span>
                  </Link>
                )}
              </div>

              {/* Message Stream */}
              <div className={styles.messageStream}>
                {messages.length === 0 ? (
                  <div className={styles.noSelectionWrap} style={{ margin: "auto" }}>
                    <span className="material-icons-round" style={{ fontSize: "36px", color: "#cbd5e1" }}>
                      forum
                    </span>
                    <p style={{ margin: 0, fontSize: "13px" }}>
                      Say hello to {activeConv.buyerName || "the customer"} and answer their questions!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMerchant = m.senderRole === "merchant" || m.senderId === user?.uid;

                    return (
                      <div
                        key={m.id}
                        className={`${styles.bubbleRow} ${
                          isMerchant ? styles.bubbleRowMerchant : styles.bubbleRowBuyer
                        }`}
                      >
                        <div
                          className={`${styles.bubble} ${
                            isMerchant ? styles.bubbleMerchant : styles.bubbleBuyer
                          }`}
                        >
                          <div>{m.text}</div>
                          <div className={styles.bubbleFooter}>
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMerchant && (
                              <span className="material-icons-round" style={{ fontSize: "13px" }}>
                                {m.read ? "done_all" : "done"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className={styles.quickChipsWrap}>
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    type="button"
                    className={styles.quickChip}
                    onClick={() => handleSendMessage(reply)}
                    disabled={isSending}
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Composer */}
              <form
                className={styles.composer}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
              >
                <input
                  type="text"
                  className={styles.composerInput}
                  placeholder="Type your reply to customer..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={!inputText.trim() || isSending}
                  title="Send message (Enter)"
                >
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    send
                  </span>
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noSelectionWrap}>
              <div className={styles.noSelectionIcon}>
                <span className="material-icons-round">chat</span>
              </div>
              <h3 className={styles.noSelectionTitle}>No Conversation Selected</h3>
              <p className={styles.noSelectionText}>
                Select an inquiry from the left panel to review questions from customers and respond directly.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
