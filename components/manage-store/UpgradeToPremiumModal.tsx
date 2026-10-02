"use client";

import { useState } from "react";
import styles from "./manage-store.module.css";
import type { Store } from "@/types/store";
import { useAuth } from "@/context/AuthContext";
import { getStoreFullUrl } from "@/lib/storeUrl";

interface UpgradeToPremiumModalProps {
  store: Store;
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: (updatedStore: Store) => void;
}

const PLATFORM_BANK = {
  bankName: process.env.NEXT_PUBLIC_STORE_BANK_NAME || "OPay",
  accountNumber: process.env.NEXT_PUBLIC_STORE_ACCOUNT_NUMBER || "8038737198",
  accountName: process.env.NEXT_PUBLIC_STORE_ACCOUNT_NAME || "Divine Joshua David",
};

const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348038737198";

export default function UpgradeToPremiumModal({
  store,
  isOpen,
  onClose,
  onUpgradeSuccess,
}: UpgradeToPremiumModalProps) {
  const { user } = useAuth();
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [activatedUrl, setActivatedUrl] = useState("");

  if (!isOpen) return null;

  const handleCopyBank = () => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(PLATFORM_BANK.accountNumber);
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2500);
    }
  };

  const handleCopySubdomain = () => {
    const url = activatedUrl || `https://${store.slug}.devico.online`;
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedSubdomain(true);
      setTimeout(() => setCopiedSubdomain(false), 2500);
    }
  };

  const handleWhatsAppProof = () => {
    const cleanNumber = ADMIN_WHATSAPP.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hello Divine, I have made payment to activate the Unique Subdomain (${store.slug}.devico.online) for my store "${store.name}".\n\nStore Handle: ${store.slug}\nPayment: ₦5,000 One-time Activation\nPaid to: OPay - 8038737198 (Divine Joshua David)\nRef / Sender: ${transactionRef.trim() || "Attaching payment proof receipt..."}`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please sign in to proceed with store upgrade.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/store/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionRef: transactionRef.trim() || `TXN_${Date.now()}`,
          paymentMethod: "bank_transfer",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to activate upgrade.");
      }

      const updated = data.store as Store;
      const fullUrl = data.fullUrl || getStoreFullUrl(updated);
      setActivatedUrl(fullUrl);
      setIsSuccess(true);
      onUpgradeSuccess(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to process activation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent} style={{ maxWidth: "560px" }}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="material-icons-round" style={{ color: "#f59e0b", fontSize: "24px" }}>
              workspace_premium
            </span>
            {isSuccess ? "Subdomain Activated!" : "Upgrade to Unique Subdomain"}
          </h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} disabled={isSubmitting}>
            <span className="material-icons-round">close</span>
          </button>
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div className={styles.modalBody} style={{ textAlign: "center", padding: "28px 20px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#16a34a",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "36px" }}>
                verified
              </span>
            </div>

            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
              Congratulations! Your Unique Subdomain is Live
            </h3>
            <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.5, margin: "0 0 20px" }}>
              Your brand now runs on its dedicated standalone web address. Anyone visiting will land directly on your custom storefront.
            </p>

            {/* Subdomain pill */}
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: "12px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>
                  Your Active Web Address
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#14532d" }}>
                  {store.slug}.devico.online
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopySubdomain}
                style={{
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  color: "#15803d",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  {copiedSubdomain ? "check" : "content_copy"}
                </span>
                {copiedSubdomain ? "Copied!" : "Copy URL"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                className={styles.saveModalBtn}
                onClick={onClose}
                style={{ background: "#4f46e5" }}
              >
                Done
              </button>
              <a
                href={activatedUrl || `https://${store.slug}.devico.online`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cancelModalBtn}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  open_in_new
                </span>
                Visit Subdomain
              </a>
            </div>
          </div>
        ) : (
          /* Upgrade Pitch & Payment Flow */
          <form className={styles.modalForm} onSubmit={handleActivate}>
            <div className={styles.modalBody}>
              {error && (
                <div
                  style={{
                    background: "#fff1f2",
                    color: "#e11d48",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "14px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* URL Transformation Preview */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
                  border: "1px solid #e0e7ff",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", fontWeight: 600 }}>
                  URL Comparison
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>Standard (Free):</span>
                    <code style={{ background: "#ffffff", padding: "3px 8px", borderRadius: "6px", color: "#475569" }}>
                      devico.online/{store.slug}
                    </code>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13.5px" }}>
                    <span style={{ color: "#4f46e5", fontWeight: 700 }}>Pro Subdomain:</span>
                    <code
                      style={{
                        background: "#4f46e5",
                        color: "#ffffff",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontWeight: 700,
                      }}
                    >
                      {store.slug}.devico.online
                    </code>
                  </div>
                </div>
              </div>

              {/* Perks Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <div style={{ background: "#fafbff", border: "1px solid #edf0f7", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#4f46e5" }}>
                      language
                    </span>
                    Dedicated Subdomain
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Your own standalone web address for Instagram &amp; TikTok bios.
                  </div>
                </div>

                <div style={{ background: "#fafbff", border: "1px solid #edf0f7", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#f59e0b" }}>
                      stars
                    </span>
                    Gold PRO Badge
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Builds trust with a prestigious verified pro badge on your store.
                  </div>
                </div>

                <div style={{ background: "#fafbff", border: "1px solid #edf0f7", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#10b981" }}>
                      trending_up
                    </span>
                    Priority Search
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Higher placement in search results and category browsing.
                  </div>
                </div>

                <div style={{ background: "#fafbff", border: "1px solid #edf0f7", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#8b5cf6" }}>
                      all_inclusive
                    </span>
                    Lifetime Access
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    One-time activation fee. No recurring monthly subscriptions.
                  </div>
                </div>
              </div>

              {/* Price & Bank Details */}
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>
                      Activation Fee
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#78350f" }}>
                      ₦5,000 <span style={{ fontSize: "12px", fontWeight: 500, color: "#b45309" }}>one-time</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fcd34d",
                      color: "#92400e",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: "15px" }}>
                      {copiedBank ? "check" : "content_copy"}
                    </span>
                    {copiedBank ? "Account Copied!" : "Copy Account"}
                  </button>
                </div>

                <div style={{ fontSize: "12.5px", color: "#92400e", lineHeight: 1.5 }}>
                  <strong>Bank:</strong> {PLATFORM_BANK.bankName} • <strong>Acct No:</strong> {PLATFORM_BANK.accountNumber} <br />
                  <strong>Account Name:</strong> {PLATFORM_BANK.accountName}
                </div>
              </div>

              {/* Payment Reference Input & Confirmation */}
              <div className={styles.formGroup} style={{ marginBottom: "14px" }}>
                <label className={styles.formLabel}>Bank Transfer Reference / Transaction ID</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. OPAY987654321 or sender account name"
                  disabled={isSubmitting}
                />
                <span className={styles.formFieldHint}>
                  Transfer ₦5,000 to the account above, then enter your transfer reference or sender name.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleWhatsAppProof}
                  style={{
                    flex: 1,
                    background: "#25d366",
                    color: "#ffffff",
                    border: 0,
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    chat
                  </span>
                  Send Receipt via WhatsApp
                </button>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelModalBtn} onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.saveModalBtn}
                disabled={isSubmitting}
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  boxShadow: "0 3px 10px rgba(217, 119, 6, 0.3)",
                }}
              >
                {isSubmitting ? "Activating Subdomain..." : "Confirm & Activate Subdomain"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
