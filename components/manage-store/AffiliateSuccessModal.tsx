"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./manage-store.module.css";
import type { Product } from "@/types/product";

interface AffiliateSuccessModalProps {
  product: Product;
  currencyFormatter: Intl.NumberFormat;
  onClose: () => void;
}

export default function AffiliateSuccessModal({
  product,
  currencyFormatter,
  onClose,
}: AffiliateSuccessModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://devico.online";

  const code = (product.affiliateCode || "PARTNER").trim().toUpperCase();
  const affiliateUrl =
    product.affiliateMarketingUrl ||
    `${baseUrl}/products/${product.id}?aff=${encodeURIComponent(code)}`;

  const commissionRate = product.affiliateCommissionPercentage || 10;
  const commissionAmount =
    product.affiliateCommissionAmount ||
    Math.round((product.price * commissionRate) / 100);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(affiliateUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Earn ₦${commissionAmount.toLocaleString()} (${commissionRate}%) commission by promoting "${product.name}" on Sellora!\n\nPromote using this official marketing link to get credited per sale: ${affiliateUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent} style={{ maxWidth: "600px" }}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle} style={{ color: "#059669" }}>
            <span className="material-icons-round">campaign</span>
            Affiliate Marketing Ready
          </h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Celebratory Banner */}
          <div className={styles.affiliateCelebrationHeader}>
            <div className={styles.affiliateCelebrationBadge}>
              <span className="material-icons-round" style={{ fontSize: "32px" }}>
                celebration
              </span>
            </div>
            <h2 className={styles.affiliateCelebrationTitle}>
              Product Listed &amp; Marketing Link Active!
            </h2>
            <p className={styles.affiliateCelebrationSub}>
              Your unique affiliate marketing URL is live. Share it with influencers, promoters, or on social media to drive commission-based sales.
            </p>
          </div>

          {/* Product Hero Info */}
          <div className={styles.affiliateProductHero}>
            <img
              src={product.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=80"}
              alt={product.name}
              className={styles.affiliateProductHeroImg}
            />
            <div className={styles.affiliateProductHeroInfo}>
              <h4 className={styles.affiliateProductHeroTitle} title={product.name}>
                {product.name}
              </h4>
              <div className={styles.affiliateProductHeroMeta}>
                <strong style={{ color: "#0f172a" }}>
                  {currencyFormatter.format(product.price)}
                </strong>
                <span className={styles.affiliateCommissionHeroTag}>
                  ₦{commissionAmount.toLocaleString()} ({commissionRate}%) Commission
                </span>
                {product.sku && (
                  <span style={{ color: "#64748b", fontSize: "12px" }}>
                    SKU: {product.sku}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Unique Affiliate Marketing URL Container */}
          <div className={styles.affiliateUrlPreviewBox} style={{ background: "#ffffff", borderColor: "#bfdbfe" }}>
            <div className={styles.affiliateUrlPreviewHeader}>
              <span style={{ color: "#1e3a8a", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span className="material-icons-round" style={{ fontSize: "15px", color: "#2563eb" }}>link</span>
                Unique Affiliate Marketing URL
              </span>
              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                Code: {code}
              </span>
            </div>

            <div className={styles.affiliateUrlRow}>
              <input
                type="text"
                readOnly
                value={affiliateUrl}
                className={styles.affiliateUrlText}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                className={`${styles.affiliateCopyBtn} ${
                  copiedLink ? styles.affiliateCopyBtnSuccess : ""
                }`}
                onClick={handleCopyLink}
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  {copiedLink ? "check" : "content_copy"}
                </span>
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
              <button
                type="button"
                className={styles.affiliateShareWhatsAppBtn}
                onClick={handleShareWhatsApp}
                title="Share link on WhatsApp"
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  chat
                </span>
                WhatsApp
              </button>
            </div>
          </div>

          {/* Tips Box */}
          <div className={styles.affiliateTipsBox}>
            <strong>💡 Pro-Tips to Maximize Affiliate Sales:</strong>
            <ul className={styles.affiliateTipsList}>
              <li>
                <strong>Automatic Tracking:</strong> Every buyer who visits using this link has code <code>{code}</code> saved for 30 days.
              </li>
              <li>
                <strong>Orders Attribution:</strong> Referred orders will display this affiliate code in your <strong>Merchant Orders</strong> tab.
              </li>
              <li>
                <strong>Promote Anywhere:</strong> Paste this URL on WhatsApp Status, Facebook Groups, TikTok bio, or send directly to brand promoters.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter} style={{ justifyContent: "space-between" }}>
          <Link
            href={`/products/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cancelModalBtn}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              open_in_new
            </span>
            View Live Product
          </Link>
          <button
            type="button"
            className={styles.saveModalBtn}
            onClick={onClose}
          >
            Done / Back to Catalog
          </button>
        </div>
      </div>
    </div>
  );
}
