"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";
import { getStoreRelativePath } from "@/lib/storeUrl";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
}

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const initialImage =
    product.image ||
    (Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : "/favico.png");

  const [imageSrc, setImageSrc] = useState(initialImage);
  const [isAdded, setIsAdded] = useState(false);

  const roundedRating = Math.round(Number(product.rating || 5));

  // Determine discount percentage if on sale
  const discount =
    product.discountPercentage ||
    (product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null);

  // Check inventory availability
  const isOutOfStock =
    product.inStock === false ||
    (product.stock !== undefined && product.stock <= 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1400);
  };

  return (
    <article className={styles.card}>
      <Link
        href={`/products/${product.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
        title={`View details for ${product.name}`}
      >
        <div className={styles.image}>
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageSrc("/favico.png")}
          />
          {discount && discount > 0 ? (
            <span className={styles.cardDiscountBadge}>-{discount}%</span>
          ) : product.oldPrice ? (
            <b>Sale</b>
          ) : null}

          {isOutOfStock && (
            <span className={styles.cardOutOfStockBadge}>Sold Out</span>
          )}
        </div>
      </Link>

      <div className={styles.info}>
        <small>{product.category}</small>
        <Link
          href={`/products/${product.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
          title={`View details for ${product.name}`}
        >
          <h2>{product.name}</h2>
        </Link>
        {product.author ? (
          <Link
            href={getStoreRelativePath(product.author)}
            onClick={(e) => e.stopPropagation()}
            className={styles.cardMerchantLink}
            title={`Visit ${product.author} storefront`}
          >
            <span className="material-icons-round" style={{ fontSize: "13px" }}>
              storefront
            </span>
            <span>{product.author}</span>
          </Link>
        ) : (
          <small className={styles.cardMerchantDefault}>Sellora Merchant</small>
        )}

        <p className={styles.rating}>
          <i aria-hidden="true">
            {"★".repeat(Math.min(5, Math.max(0, roundedRating)))}
            {"☆".repeat(Math.max(0, 5 - roundedRating))}
          </i>
          <span>{(product.rating || 5.0).toFixed(1)}</span>
          {Boolean(product.reviewsCount) && (
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              ({product.reviewsCount})
            </span>
          )}
        </p>

        <p>
          <strong>{currency.format(product.price)}</strong>
          {product.oldPrice && <del>{currency.format(product.oldPrice)}</del>}
        </p>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`${isAdded ? styles.cardAddedBtn : ""} ${
            isOutOfStock ? styles.cardDisabledBtn : ""
          }`}
          aria-label={
            isOutOfStock
              ? `${product.name} is out of stock`
              : `Add ${product.name} to cart`
          }
        >
          <span className="material-icons-round">
            {isAdded ? "check" : isOutOfStock ? "block" : "shopping_cart"}
          </span>
          {isAdded ? "Added to Cart!" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
