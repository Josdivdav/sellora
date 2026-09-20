"use client";

import { useState } from "react";
import styles from "./product.module.css";
import type { Product } from "@/types/product";

interface ProductGalleryProps {
  product: Product;
}

export default function ProductGallery({ product }: ProductGalleryProps) {
  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const [activeImage, setActiveImage] = useState(allImages[0]);

  return (
    <div className={styles.galleryWrap}>
      <div className={styles.mainImageContainer}>
        <img
          src={activeImage}
          alt={product.name}
          className={styles.mainImage}
        />

        {product.discountPercentage && product.discountPercentage > 0 ? (
          <span className={styles.saleBadge}>
            {product.discountPercentage}% OFF
          </span>
        ) : product.oldPrice ? (
          <span className={styles.saleBadge}>SALE</span>
        ) : null}
      </div>

      {allImages.length > 1 && (
        <div className={styles.thumbnailsRow}>
          {allImages.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.thumbnailBtn} ${
                activeImage === imgUrl ? styles.thumbnailBtnActive : ""
              }`}
              onClick={() => setActiveImage(imgUrl)}
              aria-label={`View image ${idx + 1}`}
            >
              <img
                src={imgUrl}
                alt={`${product.name} thumbnail ${idx + 1}`}
                className={styles.thumbnailImg}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
