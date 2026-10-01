"use client";

import styles from "@/app/home.module.css";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";
import EmptyState from "./EmptyState";

interface ProductGridProps {
  category: string;
  products: Product[];
  isLoading?: boolean;
  onAddToCart: (product: Pick<Product, "id" | "name">) => void;
  sortBy?: string;
  onSortChange?: (newSort: string) => void;
  onResetFilters?: () => void;
  searchQuery?: string;
}

export default function ProductGrid({
  category,
  products,
  isLoading = false,
  onAddToCart,
  sortBy = "FEATURED",
  onSortChange,
  onResetFilters,
  searchQuery = "",
}: ProductGridProps) {
  const displayTitle = category === "All" ? "All Products" : category;

  return (
    <>
      <div className={styles.heading}>
        <div className={styles.headingLeft}>
          <h1>{displayTitle}</h1>
          <span className={styles.itemCountBadge}>
            {isLoading
              ? "Loading..."
              : `${products.length} product${products.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {!isLoading && products.length > 0 && onSortChange && (
          <div className={styles.sortWrapper}>
            <label htmlFor="product-sort-select" className={styles.sortLabel}>
              Sort by:
            </label>
            <select
              id="product-sort-select"
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort products catalog"
            >
              <option value="FEATURED">Featured</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="RATING">Highest Rated</option>
              <option value="NEWEST">Newest Arrivals</option>
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <section className={styles.grid} aria-label="Loading products">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonInfo}>
                <div
                  className={styles.skeletonLine}
                  style={{ width: "40%", height: "10px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "85%", height: "16px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "50%", height: "14px" }}
                />
                <div
                  className={styles.skeletonLine}
                  style={{ width: "65%", height: "18px", marginTop: "4px" }}
                />
              </div>
            </div>
          ))}
        </section>
      ) : products.length > 0 ? (
        <section className={styles.grid} aria-label="Products catalog">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title={
            searchQuery
              ? `No products matching "${searchQuery}"`
              : category !== "All"
              ? `No products in ${category}`
              : "No products found"
          }
          description={
            searchQuery
              ? `We couldn't find any products matching your search term. Try checking spelling or using broader keywords.`
              : `There are currently no items available under this selection. Explore other verified merchant collections!`
          }
          onReset={onResetFilters}
          showReset={Boolean(onResetFilters)}
        />
      )}
    </>
  );
}
