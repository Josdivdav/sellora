"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./buyer-messages.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import HomeHeader from "@/components/home/HomeHeader";
import Sidebar from "@/components/SidebarN";
import type { Conversation, ChatMessage } from "@/types/chat";

const BUYER_PROMPTS = [
  "Is this item still in stock and available for delivery?",
  "How soon will this be dispatched?",
  "Can you confirm the available sizes or colors?",
  "Does this come with warranty or guarantee?",
];

export default function BuyerMessagesClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

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

  // 1. Fetch conversations for buyer
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

  useEffect(() => {
    if (user) {
      void fetchConversations(true);
    } else {
      setIsLoadingConvs(false);
    }
  }, [user, fetchConversations]);

  // Periodic poll for conversations list
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

  useEffect(() => {
    if (selectedConvId) {
      void fetchMessages(selectedConvId);
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
        await fetchMessages(selectedConvId);
        await fetchConversations(false);
      }
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.storeName?.toLowerCase().includes(q) ||
      c.product?.name.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  const activeConv = conversations.find((c) => c.id === selectedConvId);

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
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={async () => {
            await SignOut();
            router.push("/");
          }}
          onSignIn={() => router.push("/login")}
          hasStore={hasStore}
        />

        <main className={styles.main}>
          {/* Breadcrumbs */}
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbLink}>
              Home
            </Link>
            <span>/</span>
            <span>Messages</span>
          </nav>

          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                <span className="material-icons-round" style={{ color: "#2b6dff" }}>
                  forum
                </span>
                Messages with Stores
              </h1>
              <p className={styles.pageSub}>
                Direct inquiries and conversations with verified sellers on Sellora.
              </p>
            </div>
          </div>

          {/* Guest State: Must have an account before sending messages */}
          {!authLoading && !user ? (
            <div className={styles.guestBox}>
              <div className={styles.guestIconWrap}>
                <span className="material-icons-round">lock</span>
              </div>
              <h2 className={styles.guestTitle}>Sign in to view your messages</h2>
              <p className={styles.guestDesc}>
                To chat with sellers, ask about product availability, and keep your communication secure, please sign in or create a Sellora account.
              </p>
              <div className={styles.guestActions}>
                <Link
                  href="/login?redirect=/account/messages"
                  className={styles.guestLoginBtn}
                >
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    login
                  </span>
                  Sign In
                </Link>
                <Link
                  href="/register?redirect=/account/messages"
                  className={styles.guestRegisterBtn}
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.chatContainer}>
              {/* Left Column: Conversations List */}
              <aside className={styles.sidebarPanel}>
                <div className={styles.searchWrap}>
                  <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search stores or products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className={styles.convScroll}>
                  {isLoadingConvs ? (
                    <div className={styles.emptyList}>
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "32px", color: "#cbd5e1" }}
                      >
                        hourglass_empty
                      </span>
                      <span>Loading conversations...</span>
                    </div>
                  ) : filteredConvs.length === 0 ? (
                    <div className={styles.emptyList}>
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "36px", color: "#cbd5e1" }}
                      >
                        forum
                      </span>
                      <strong style={{ color: "#475569", fontSize: "14px" }}>
                        No conversations yet
                      </strong>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Click &ldquo;Chat with Seller&rdquo; on any product page or storefront to start a conversation.
                      </span>
                      <Link
                        href="/"
                        style={{
                          marginTop: "8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          color: "#2b6dff",
                          fontSize: "12.5px",
                          fontWeight: 700,
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>
                          storefront
                        </span>
                        Browse Products
                      </Link>
                    </div>
                  ) : (
                    filteredConvs.map((c) => {
                      const isActive = c.id === selectedConvId;
                      const unread = c.unreadCountBuyer || 0;
                      const initial = (c.storeName || "S")[0].toUpperCase();

                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.convCard} ${isActive ? styles.convCardActive : ""}`}
                          onClick={() => setSelectedConvId(c.id)}
                        >
                          <div className={styles.storeAvatar}>{initial}</div>

                          <div className={styles.convInfo}>
                            <div className={styles.convTop}>
                              <span className={styles.storeName}>{c.storeName}</span>
                              <span className={styles.convTime}>
                                {formatTime(c.lastMessageTimestamp)}
                              </span>
                            </div>

                            {c.product && (
                              <div className={styles.productBadge}>
                                <span className="material-icons-round" style={{ fontSize: "12px" }}>
                                  shopping_bag
                                </span>
                                <span>{c.product.name}</span>
                              </div>
                            )}

                            <div className={styles.lastMsgWrap}>
                              <p className={styles.lastMsg}>
                                {c.lastMessage || "Started conversation"}
                              </p>
                              {unread > 0 && (
                                <span className={styles.badge}>{unread}</span>
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
              <section className={styles.chatArea}>
                {activeConv ? (
                  <>
                    {/* Header */}
                    <div className={styles.chatHead}>
                      <div className={styles.chatHeadLeft}>
                        <div className={styles.storeAvatar}>
                          {(activeConv.storeName || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.chatHeadTitle}>{activeConv.storeName}</div>
                          <div className={styles.chatHeadSub}>
                            <span className={styles.dot} />
                            <span>Verified Store</span>
                          </div>
                        </div>
                      </div>

                      {/* Product Banner */}
                      {activeConv.product && (
                        <Link
                          href={`/product/${activeConv.product.id}`}
                          target="_blank"
                          className={styles.productCardBanner}
                          title="View product details in new tab"
                        >
                          <img
                            src={activeConv.product.image}
                            alt={activeConv.product.name}
                            className={styles.productImg}
                          />
                          <div className={styles.productTexts}>
                            <div className={styles.productName}>
                              {activeConv.product.name}
                            </div>
                            <div className={styles.productPrice}>
                              ₦{(activeConv.product.price ?? 0).toLocaleString()}
                            </div>
                          </div>
                          <span
                            className="material-icons-round"
                            style={{ fontSize: "16px", color: "#94a3b8" }}
                          >
                            open_in_new
                          </span>
                        </Link>
                      )}
                    </div>

                    {/* Messages Stream */}
                    <div className={styles.stream}>
                      {messages.length === 0 ? (
                        <div className={styles.noConvState} style={{ margin: "auto" }}>
                          <span
                            className="material-icons-round"
                            style={{ fontSize: "36px", color: "#cbd5e1" }}
                          >
                            forum
                          </span>
                          <p style={{ margin: 0, fontSize: "13px" }}>
                            Send a message to {activeConv.storeName} to ask about product details or delivery!
                          </p>
                        </div>
                      ) : (
                        messages.map((m) => {
                          const isBuyer = m.senderRole === "buyer" || m.senderId === user?.uid;

                          return (
                            <div
                              key={m.id}
                              className={`${styles.bubbleRow} ${
                                isBuyer ? styles.bubbleRowBuyer : styles.bubbleRowSeller
                              }`}
                            >
                              <div
                                className={`${styles.bubble} ${
                                  isBuyer ? styles.bubbleBuyer : styles.bubbleSeller
                                }`}
                              >
                                <div>{m.text}</div>
                                <div className={styles.bubbleFoot}>
                                  <span>
                                    {new Date(m.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {isBuyer && (
                                    <span
                                      className="material-icons-round"
                                      style={{ fontSize: "13px" }}
                                    >
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

                    {/* Quick Question Chips */}
                    <div className={styles.chipsRow}>
                      {BUYER_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          className={styles.chip}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isSending}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Composer */}
                    <form
                      className={styles.inputForm}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSendMessage();
                      }}
                    >
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Write a message to store owner..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isSending}
                      />
                      <button
                        type="submit"
                        className={styles.sendButton}
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
                  <div className={styles.noConvState}>
                    <div className={styles.noConvIcon}>
                      <span className="material-icons-round">forum</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                      Select a Conversation
                    </h3>
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", maxWidth: "300px" }}>
                      Choose a store inquiry from the left panel to continue your conversation.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
