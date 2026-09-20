"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./product.module.css";
import type { Product } from "@/types/product";

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
}

export default function ProductInfo({
  product,
  onAddToCart,
  onBuyNow,
  onShare,
  onToggleWishlist,
  isWishlisted,
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

  return (
    <div className={styles.infoWrap}>
      {/* Merchant / Author attribution */}
      {product.author && (
        <Link
          href={`/?search=${encodeURIComponent(product.author)}`}
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
      )}

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

      {/* Quantity & CTAs */}
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
