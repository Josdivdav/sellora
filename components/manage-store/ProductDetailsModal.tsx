"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./manage-store.module.css";
import type { Product } from "@/types/product";

interface ProductDetailsModalProps {
  product: Product;
  currencyFormatter: Intl.NumberFormat;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewAffiliate?: (product: Product) => void;
}

export default function ProductDetailsModal({
  product,
  currencyFormatter,
  onClose,
  onEdit,
  onDelete,
  onViewAffiliate,
}: ProductDetailsModalProps) {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [selectedImage, setSelectedImage] = useState(images[0] || product.image);

  const stockNum = product.stock ?? 0;
  const isOutOfStock = stockNum <= 0;
  const isLowStock = stockNum > 0 && stockNum < 10;
  const isInStock = stockNum >= 10;

  const discount =
    product.discountPercentage ||
    (product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : undefined);

  const [copiedLink, setCopiedLink] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://devico.online";
  const affiliateUrl =
    product.affiliateMarketingUrl ||
    `${baseUrl}/products/${product.id}?aff=${encodeURIComponent(product.affiliateCode || "partner")}`;
  const affiliateCommission =
    product.affiliateCommissionAmount ||
    Math.round((product.price * (product.affiliateCommissionPercentage || 10)) / 100);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(affiliateUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Earn ₦${affiliateCommission.toLocaleString()} (${product.affiliateCommissionPercentage || 10}%) commission by promoting "${product.name}" on Sellora! Marketing URL: ${affiliateUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent} style={{ maxWidth: "620px" }}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle}>
            <span className="material-icons-round" style={{ color: "#4f46e5" }}>
              inventory_2
            </span>
            Product Details
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

        {/* Scrollable Body */}
        <div className={styles.modalBody}>
          {/* Main Visual Display */}
          <div className={styles.detailGalleryWrap}>
            <div className={styles.detailMainImageWrap}>
              <img
                src={selectedImage || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80"}
                alt={product.name}
                className={styles.detailMainImage}
              />
              <div className={styles.detailImageBadges}>
                <span className={styles.detailCategoryBadge}>{product.category}</span>
                {isInStock && (
                  <span className={styles.stockBadgeIn}>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      check_circle
                    </span>
                    In Stock ({stockNum})
                  </span>
                )}
                {isLowStock && (
                  <span className={styles.stockBadgeLow}>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      priority_high
                    </span>
                    Low Stock ({stockNum})
                  </span>
                )}
                {isOutOfStock && (
                  <span className={styles.stockBadgeOut}>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      cancel
                    </span>
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Gallery Thumbs if multiple */}
            {images.length > 1 && (
              <div className={styles.detailThumbsRow}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.detailThumbBtn} ${
                      selectedImage === img ? styles.detailThumbBtnActive : ""
                    }`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className={styles.detailThumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Overview Header */}
          <div className={styles.detailInfoSection}>
            <div className={styles.detailTitleRow}>
              <h2 className={styles.detailTitle}>{product.name}</h2>
              {product.sku && (
                <span className={styles.detailSku}>SKU: {product.sku}</span>
              )}
            </div>

            {/* Price Box */}
            <div className={styles.detailPriceBox}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span className={styles.detailCurrentPrice}>
                  {currencyFormatter.format(product.price)}
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className={styles.detailOldPrice}>
                    {currencyFormatter.format(product.oldPrice)}
                  </span>
                )}
              </div>
              {discount && (
                <span className={styles.detailDiscountBadge}>
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* 4-Stat Metric Cards */}
            <div className={styles.detailMetricsGrid}>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>Available Stock</span>
                <span className={styles.detailMetricValue}>
                  {stockNum} {stockNum === 1 ? "unit" : "units"}
                </span>
              </div>

              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>Category</span>
                <span className={styles.detailMetricValue}>{product.category}</span>
              </div>

              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>Rating</span>
                <span className={styles.detailMetricValue} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#f59e0b" }}>
                    star
                  </span>
                  {product.rating || 5.0} ({product.reviewsCount || 0} reviews)
                </span>
              </div>

              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>Storefront</span>
                <span className={styles.detailMetricValue}>{product.author || "Sellora"}</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className={styles.detailDescBox}>
                <span className={styles.detailDescLabel}>Product Description</span>
                <p className={styles.detailDescText}>{product.description}</p>
              </div>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className={styles.formGroup}>
                <span className={styles.detailDescLabel}>Tags & Keywords</span>
                <div className={styles.detailTagsWrap}>
                  {product.tags.map((tag, idx) => (
                    <span key={idx} className={styles.detailTagPill}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliate Marketing Details if active */}
            {product.isAffiliateEnabled && (
              <div className={styles.affiliateSectionCard} style={{ marginTop: "16px" }}>
                <div className={styles.affiliateToggleHeader}>
                  <div className={styles.affiliateToggleTitleWrap}>
                    <div className={styles.affiliateIconWrap} style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#059669" }}>
                      <span className="material-icons-round" style={{ fontSize: "20px" }}>campaign</span>
                    </div>
                    <div>
                      <h4 className={styles.affiliateToggleTitle} style={{ color: "#065f46" }}>
                        Affiliate Marketing Active
                      </h4>
                      <p className={styles.affiliateToggleSubtitle}>
                        Marketers earn <strong>{product.affiliateCommissionPercentage || 10}% (₦{affiliateCommission.toLocaleString()})</strong> per referred sale.
                      </p>
                    </div>
                  </div>

                  <span className={styles.affiliateBadgePill} style={{ background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}>
                    <span className="material-icons-round" style={{ fontSize: "12px" }}>verified</span>
                    Enabled
                  </span>
                </div>

                <div className={styles.affiliateUrlPreviewBox}>
                  <div className={styles.affiliateUrlPreviewHeader}>
                    <span>Unique Marketing Link</span>
                    {product.affiliateCode && (
                      <span style={{ color: "#2563eb", fontWeight: 700 }}>Code: {product.affiliateCode}</span>
                    )}
                  </div>
                  <div className={styles.affiliateUrlRow}>
                    <span className={styles.affiliateUrlText} title={affiliateUrl}>
                      {affiliateUrl}
                    </span>
                    <button
                      type="button"
                      className={`${styles.affiliateCopyBtn} ${
                        copiedLink ? styles.affiliateCopyBtnSuccess : ""
                      }`}
                      onClick={handleCopyLink}
                    >
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
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
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        chat
                      </span>
                      WhatsApp
                    </button>
                    {onViewAffiliate && (
                      <button
                        type="button"
                        className={styles.affiliateCopyBtn}
                        style={{ background: "#4f46e5" }}
                        onClick={() => onViewAffiliate(product)}
                        title="Open Full Affiliate Share Hub"
                      >
                        <span className="material-icons-round" style={{ fontSize: "14px" }}>
                          share
                        </span>
                        Affiliate Hub
                      </button>
                    )}
                  </div>
                </div>

                {product.affiliateTerms && (
                  <div style={{ fontSize: "12px", color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px" }}>
                    <strong style={{ color: "#334155" }}>Terms: </strong>
                    {product.affiliateTerms}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pinned Footer with Action Buttons */}
        <div className={styles.modalFooter} style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <button
            type="button"
            className={styles.deleteModalBtn}
            onClick={() => {
              onClose();
              onDelete(product);
            }}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              delete
            </span>
            Delete Product
          </button>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href={`/products/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.livePreviewBtn}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                open_in_new
              </span>
              View Live Page
            </Link>

            <button
              type="button"
              className={styles.saveModalBtn}
              onClick={() => {
                onClose();
                onEdit(product);
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                edit
              </span>
              Edit Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
