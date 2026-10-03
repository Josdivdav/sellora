"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import AuthPromptModal from "./AuthPromptModal";
import styles from "./chat.module.css";

const QUICK_QUESTIONS = [
  "Is this item currently in stock?",
  "How fast can you dispatch to my city?",
  "Can I negotiate or get a discount on bulk order?",
  "Do you have other sizes or colors available?",
];

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default function ChatWidget() {
  const { user } = useAuth();
  const {
    isOpen,
    activeConversation,
    messages,
    isLoading,
    isSending,
    authPromptOpen,
    authPromptStore,
    closeChat,
    sendMessage,
    closeAuthPrompt,
  } = useChat();

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when new messages appear
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isSending) return;
    const textToSend = inputVal;
    setInputVal("");
    await sendMessage(textToSend);
  };

  const handleQuickQuestion = async (qText: string) => {
    await sendMessage(qText);
  };

  return (
    <>
      {/* Auth Prompt Modal for unauthenticated buyers */}
      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={closeAuthPrompt}
        storeName={authPromptStore?.name}
      />

      {/* Floating Chat Drawer Window */}
      {isOpen && activeConversation && (
        <div className={styles.chatFloatingWrap}>
          <div className={styles.chatWindow}>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                {activeConversation.storeLogo ? (
                  <img
                    src={activeConversation.storeLogo}
                    alt={activeConversation.storeName}
                    className={styles.chatAvatar}
                  />
                ) : (
                  <div className={styles.chatAvatar}>
                    {activeConversation.storeName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.chatHeaderName}>
                    {activeConversation.storeName}
                    <span
                      className="material-icons-round"
                      style={{ fontSize: "15px", color: "#60a5fa" }}
                    >
                      verified
                    </span>
                  </div>
                  <div className={styles.chatHeaderStatus}>
                    <span className={styles.onlineDot} />
                    Active on Sellora
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.chatCloseBtn}
                onClick={closeChat}
                aria-label="Close chat"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* Product Snippet Context */}
            {activeConversation.product && (
              <div className={styles.productSnippet}>
                {activeConversation.product.image && (
                  <img
                    src={activeConversation.product.image}
                    alt={activeConversation.product.name}
                    className={styles.productSnippetImg}
                  />
                )}
                <div className={styles.productSnippetInfo}>
                  <div className={styles.productSnippetTitle}>
                    {activeConversation.product.name}
                  </div>
                  {activeConversation.product.price !== undefined && (
                    <div className={styles.productSnippetPrice}>
                      {currency.format(activeConversation.product.price)}
                    </div>
                  )}
                </div>
                {activeConversation.product.id && (
                  <Link
                    href={`/products/${activeConversation.product.id}`}
                    style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700 }}
                  >
                    View
                  </Link>
                )}
              </div>
            )}

            {/* Messages Body */}
            <div className={styles.messagesBody}>
              {isLoading && messages.length === 0 ? (
                <div className={styles.emptyChatState}>
                  <span
                    className="material-icons-round"
                    style={{ fontSize: "28px", animation: "spin 1s linear infinite" }}
                  >
                    sync
                  </span>
                  <p>Connecting to {activeConversation.storeName}...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyChatState}>
                  <span className="material-icons-round" style={{ fontSize: "36px", color: "#cbd5e1" }}>
                    forum
                  </span>
                  <strong>Start a conversation</strong>
                  <p>
                    Ask {activeConversation.storeName} about product specs, delivery speed, or custom requests.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOut = msg.senderId === user?.uid;
                  const timeFormatted = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <div
                      key={msg.id || idx}
                      className={`${styles.messageRow} ${
                        isOut ? styles.messageRowOut : styles.messageRowIn
                      }`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          isOut ? styles.messageBubbleOut : styles.messageBubbleIn
                        }`}
                      >
                        {msg.text}
                      </div>
                      <div className={styles.messageMeta}>
                        <span>{timeFormatted}</span>
                        {isOut && (
                          <span
                            className="material-icons-round"
                            style={{ fontSize: "13px", color: msg.read ? "#2563eb" : "#94a3b8" }}
                          >
                            {msg.read ? "done_all" : "done"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips (shown when few messages) */}
            {messages.length < 3 && (
              <div className={styles.quickChipsWrap}>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={styles.quickChip}
                    onClick={() => handleQuickQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className={styles.chatInputArea}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder={`Message ${activeConversation.storeName}...`}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputVal.trim() || isSending}
                aria-label="Send message"
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>
                  send
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
