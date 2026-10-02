"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./product.module.css";
import type { Product } from "@/types/product";
import { getStoreRelativePath } from "@/lib/storeUrl";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface ProductInfoProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onShare: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  isAuthor?: boolean;
  activeAffiliateCode?: string | null;
}

export default function ProductInfo({
  product,
  onAddToCart,
  onBuyNow,
  onShare,
  onToggleWishlist,
  isWishlisted,
  isAuthor = false,
  activeAffiliateCode = null,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const roundedRating = Math.round(product.rating);
  const maxStock = product.stock || 50;

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  const discountAmount = product.oldPrice ? product.oldPrice - product.price : 0;

  // Affiliate Marketing calculation & unique marketing link
  const [copiedAffiliate, setCopiedAffiliate] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://devico.online";
  const affiliateMarketingUrl =
    product.affiliateMarketingUrl ||
    `${baseUrl}/products/${product.id}?aff=${encodeURIComponent(product.affiliateCode || "partner")}`;
  const affiliateCommissionAmount =
    product.affiliateCommissionAmount ||
    Math.round((product.price * (product.affiliateCommissionPercentage || 10)) / 100);

  const handleCopyAffiliate = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(affiliateMarketingUrl);
      setCopiedAffiliate(true);
      setTimeout(() => setCopiedAffiliate(false), 2200);
    }
  };

  const handleShareAffiliateWhatsApp = () => {
    const text = `Earn ₦${affiliateCommissionAmount.toLocaleString()} (${product.affiliateCommissionPercentage || 10}%) commission by promoting "${product.name}" on Sellora! Use this official affiliate link: ${affiliateMarketingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.infoWrap}>
      {/* Merchant / Author attribution & Contact */}
      <div className={styles.sellerHeaderRow}>
        {product.author ? (
          <Link
            href={getStoreRelativePath(product.author)}
            className={styles.storeBannerLink}
          >
            <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
              storefront
            </span>
            <span>Sold by {product.author}</span>
            <span className="material-icons-round" style={{ fontSize: "14px", color: "#2b6dff" }}>
              verified
            </span>
          </Link>
        ) : (
          <div className={styles.storeBannerLink}>
            <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
              storefront
            </span>
            <span>Sellora Official Store</span>
          </div>
        )}

        {isAuthor ? (
          <span className={styles.ownerBadge}>
            <span className="material-icons-round" style={{ fontSize: "15px" }}>
              store
            </span>
            Your Listing
          </span>
        ) : (
          <button
            type="button"
            className={styles.chatSellerBtn}
            aria-label="Chat with seller"
            title="Chat with seller"
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              chat
            </span>
            <span>Chat with Seller</span>
          </button>
        )}
      </div>

      {/* Title */}
      <h1 className={styles.productTitle}>{product.name}</h1>

      {/* Meta Row: Rating, Reviews, SKU */}
      <div className={styles.metaRow}>
        <div className={styles.ratingBadge}>
          <span className="material-icons-round" style={{ fontSize: "17px" }}>
            star
          </span>
          <span>{product.rating.toFixed(1)}</span>
          <span style={{ color: "#6b7280", fontWeight: 400 }}>
            ({product.reviewsCount || 48} reviews)
          </span>
        </div>

        {product.sku && (
          <>
            <span style={{ color: "#d1d5db" }}>•</span>
            <span className={styles.skuCode}>SKU: {product.sku}</span>
          </>
        )}

        <span style={{ color: "#d1d5db" }}>•</span>
        <span style={{ color: "#2b6dff", fontWeight: 600, fontSize: "12.5px" }}>
          {product.category}
        </span>
      </div>

      {/* Active Partner Referral Banner */}
      {activeAffiliateCode && (
        <div className={styles.affiliateAttributionBanner}>
          <div className={styles.affiliateAttributionIcon}>
            <span className="material-icons-round" style={{ fontSize: "18px" }}>
              verified
            </span>
          </div>
          <div className={styles.affiliateAttributionContent}>
            <span className={styles.affiliateAttributionLabel}>Partner Referral Applied</span>
            <span className={styles.affiliateAttributionDesc}>
              You are shopping with referral code <strong>{activeAffiliateCode}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Pricing Box */}
      <div className={styles.pricingBox}>
        <span className={styles.currentPrice}>{currency.format(product.price)}</span>

        {product.oldPrice && (
          <span className={styles.oldPrice}>{currency.format(product.oldPrice)}</span>
        )}

        {discountAmount > 0 && (
          <span className={styles.discountBadge}>
            Save {currency.format(discountAmount)}
            {product.discountPercentage ? ` (${product.discountPercentage}%)` : ""}
          </span>
        )}
      </div>

      {/* Stock Status */}
      <div className={styles.stockStatus}>
        <span className={styles.stockDot} />
        <span className={styles.stockText}>
          {product.inStock !== false
            ? `In Stock (${product.stock || 25} available for immediate dispatch)`
            : "Temporarily Out of Stock"}
        </span>
      </div>

      {/* Short Description */}
      {product.description && (
        <p className={styles.descriptionSnippet}>{product.description}</p>
      )}

      {/* Quantity & CTAs (Buyer controls vs Owner controls) */}
      {isAuthor ? (
        <div className={styles.ownerActionsBox}>
          <div className={styles.ownerNotice}>
            <span className="material-icons-round" style={{ fontSize: "20px", color: "#2b6dff" }}>
              info
            </span>
            <div>
              <div className={styles.ownerNoticeTitle}>
                You are viewing your own product listing
              </div>
              <div className={styles.ownerNoticeDesc}>
                Buyer actions (purchasing, chat, and wishlist) are disabled for the seller.
              </div>
            </div>
          </div>

          <div className={styles.ownerBtnsRow}>
            <Link
              href="/account/manage-store?tab=products"
              className={styles.manageListingBtn}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                edit
              </span>
              Manage Listing in Store
            </Link>

            <button
              type="button"
              className={styles.iconActionBtn}
              onClick={() => onShare(product)}
              aria-label="Share product"
              title="Share product link"
            >
              <span className="material-icons-round">share</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.purchaseRow}>
          <div className={styles.quantityControl}>
            <button
              type="button"
              className={styles.qtyBtn}
              onClick={handleDecrease}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className={styles.qtyInput}>{quantity}</span>
            <button
              type="button"
              className={styles.qtyBtn}
              onClick={handleIncrease}
              disabled={quantity >= maxStock}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={styles.addToCartBtn}
            onClick={() => onAddToCart(product, quantity)}
          >
            <span className="material-icons-round">shopping_cart</span>
            Add to Cart
          </button>

          <button
            type="button"
            className={styles.buyNowBtn}
            onClick={() => onBuyNow(product, quantity)}
          >
            Buy Now
          </button>

          <button
            type="button"
            className={styles.iconActionBtn}
            aria-label="Chat with seller"
            title="Chat with seller"
          >
            <span className="material-icons-round">chat</span>
          </button>

          <button
            type="button"
            className={`${styles.iconActionBtn} ${
              isWishlisted ? styles.iconActionBtnLiked : ""
            }`}
            onClick={() => onToggleWishlist(product)}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            title={isWishlisted ? "Saved in wishlist" : "Save to wishlist"}
          >
            <span className="material-icons-round">
              {isWishlisted ? "favorite" : "favorite_border"}
            </span>
          </button>

          <button
            type="button"
            className={styles.iconActionBtn}
            onClick={() => onShare(product)}
            aria-label="Share product"
            title="Share product link"
          >
            <span className="material-icons-round">share</span>
          </button>
        </div>
      )}

      {/* Affiliate Marketing Promotion Card */}
      {product.isAffiliateEnabled && (
        <div className={styles.affiliatePromoCard}>
          <div className={styles.affiliatePromoHeader}>
            <div className={styles.affiliatePromoLeft}>
              <div className={styles.affiliateBadgeIcon}>
                <span className="material-icons-round" style={{ fontSize: "20px" }}>
                  campaign
                </span>
              </div>
              <div>
                <h4 className={styles.affiliatePromoTitle}>
                  Affiliate Program: Earn ₦{affiliateCommissionAmount.toLocaleString()} / sale
                  <span className={styles.affiliateCommissionTag}>
                    {product.affiliateCommissionPercentage || 10}% Commission
                  </span>
                </h4>
                <p className={styles.affiliatePromoDesc}>
                  {isAuthor
                    ? "Your listing offers commission to promoters. Share your official unique affiliate marketing link below."
                    : "Promote this product with your unique marketing link and earn commission on every customer who buys."}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.affiliateLinkDisplay} title={affiliateMarketingUrl}>
            {affiliateMarketingUrl}
          </div>

          <div className={styles.affiliatePromoActions}>
            <button
              type="button"
              className={`${styles.affiliateCopyLinkBtn} ${
                copiedAffiliate ? styles.affiliateCopyLinkBtnCopied : ""
              }`}
              onClick={handleCopyAffiliate}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                {copiedAffiliate ? "check" : "content_copy"}
              </span>
              {copiedAffiliate ? "Link Copied!" : "Copy Affiliate Link"}
            </button>

            <button
              type="button"
              className={styles.affiliateWhatsAppShareBtn}
              onClick={handleShareAffiliateWhatsApp}
            >
              <span className="material-icons-round" style={{ fontSize: "16px", color: "#25d366" }}>
                chat
              </span>
              Share on WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Trust & Guarantees */}
      <div className={styles.assurancesList}>
        <div className={styles.assuranceItem}>
          <span className="material-icons-round">local_shipping</span>
          <span>Fast & Tracked Nationwide Delivery</span>
        </div>
        <div className={styles.assuranceItem}>
          <span className="material-icons-round">verified_user</span>
          <span>100% Authentic Guaranteed</span>
        </div>
        <div className={styles.assuranceItem}>
          <span className="material-icons-round">assignment_return</span>
          <span>7-Day Return Guarantee</span>
        </div>
        <div className={styles.assuranceItem}>
          <span className="material-icons-round">lock</span>
          <span>Secure Encrypted Payment</span>
        </div>
      </div>
    </div>
  );
}
