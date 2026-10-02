"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./favorites.module.css";
import type { Product } from "@/types/product";
import type { Store } from "@/types/store";
import { getStoreRelativePath } from "@/lib/storeUrl";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface NewArrivalsFeedProps {
  products: Product[];
  followedStores: Store[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product) => void;
  onSwitchToStoresTab: () => void;
}

export default function NewArrivalsFeed({
  products,
  followedStores,
  onAddToCart,
  onBuyNow,
  onSwitchToStoresTab,
}: NewArrivalsFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "RATING">("NEWEST");

  // Format relative time or clean date
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Recent drop";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Just added";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    } catch {
      return "Recent drop";
    }
  };

  // Find store record for a product
  const getStoreForProduct = (product: Product): Store | undefined => {
    const author = (product.author || "").toLowerCase();
    const storeId = (product.storeId || "").toLowerCase();
    return followedStores.find(
      (s) =>
        s.id.toLowerCase() === storeId ||
        (s.slug && s.slug.toLowerCase() === storeId) ||
        s.name.toLowerCase() === author ||
        (s.slug && s.slug.toLowerCase() === author)
    );
  };

  // Available categories in the feed
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searchWords = q.split(/\s+/).filter(Boolean);

    let list = products.filter((product) => {
      // Store filter
      if (selectedStore !== "ALL") {
        const store = getStoreForProduct(product);
        if (!store || store.id !== selectedStore) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "ALL") {
        if (product.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search match
      if (searchWords.length > 0) {
        const name = (product.name || "").toLowerCase();
        const author = (product.author || "").toLowerCase();
        const cat = (product.category || "").toLowerCase();
        const desc = (product.description || "").toLowerCase();
        const tags = (product.tags || []).map((t) => t.toLowerCase());

        const matches = searchWords.every(
          (w) =>
            name.includes(w) ||
            author.includes(w) ||
            cat.includes(w) ||
            desc.includes(w) ||
            tags.some((t) => t.includes(w))
        );
        if (!matches) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "PRICE_ASC") return a.price - b.price;
      if (sortBy === "PRICE_DESC") return b.price - a.price;
      if (sortBy === "RATING") return (Number(b.rating) || 5) - (Number(a.rating) || 5);

      // Default: NEWEST
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [products, searchQuery, selectedStore, selectedCategory, sortBy, followedStores]);

  // If user does not follow any stores
  if (followedStores.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon} style={{ background: "#eff6ff", color: "#2b6dff" }}>
          <span className="material-icons-round">dynamic_feed</span>
        </div>
        <h3 className={styles.emptyStateTitle}>Your Feed is Waiting for Favorite Stores</h3>
        <p className={styles.emptyStateText}>
          Follow verified stores, artisans, and boutiques on Sellora to get a personalized live stream of
          their newly added products and exclusive drops!
        </p>
        <button
          type="button"
          className={styles.visitStoreBtn}
          style={{ marginTop: "12px", width: "auto", padding: "10px 24px" }}
          onClick={onSwitchToStoresTab}
        >
          <span className="material-icons-round" style={{ fontSize: "17px" }}>
            storefront
          </span>
          Browse &amp; Follow Stores
        </button>
      </div>
    );
  }

  return (
    <div className={styles.feedContainer}>
      {/* Feed Filter & Search Row */}
      <div className={styles.feedFilterBar}>
        <div className={styles.feedFilterLeft}>
          {/* In-feed Search */}
          <div className={styles.feedSearchBox}>
            <span className="material-icons-round" style={{ fontSize: "18px", color: "#94a3b8" }}>
              search
            </span>
            <input
              type="text"
              placeholder="Search feed by item, tag, or store…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search feed"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="Clear search"
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  close
                </span>
              </button>
            )}
          </div>

          {/* Filter by Followed Store */}
          <select
            className={styles.feedSelect}
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            aria-label="Filter by store"
          >
            <option value="ALL">All Followed Stores ({followedStores.length})</option>
            {followedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Filter by Category */}
          <select
            className={styles.feedSelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Select */}
        <select
          className={styles.feedSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          aria-label="Sort products"
        >
          <option value="NEWEST">Newest Drops First</option>
          <option value="PRICE_ASC">Price: Low to High</option>
          <option value="PRICE_DESC">Price: High to Low</option>
          <option value="RATING">Highest Rated</option>
        </select>
      </div>

      {/* Grid of Product Arrivals */}
      {filteredProducts.length > 0 ? (
        <div className={styles.arrivalsGrid}>
          {filteredProducts.map((product) => {
            const store = getStoreForProduct(product);
            const storeUrl = store ? getStoreRelativePath(store) : `/${(product.author || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            const discount =
              product.oldPrice && product.oldPrice > product.price
                ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                : null;

            return (
              <article key={product.id} className={styles.arrivalCard}>
                {/* Merchant Header */}
                <div className={styles.arrivalCardHeader}>
                  <Link href={storeUrl} className={styles.arrivalMerchantLink} title={`Visit ${store?.name || product.author}`}>
                    {store?.logo ? (
                      <img src={store.logo} alt={store.name} className={styles.arrivalMerchantAvatar} />
                    ) : (
                      <div className={styles.arrivalMerchantAvatar}>
                        {(store?.name || product.author || "S")[0].toUpperCase()}
                      </div>
                    )}
                    <div className={styles.arrivalMerchantMeta}>
                      <span className={styles.arrivalMerchantName}>
                        {store?.name || product.author}
                        {(store?.isVerified ?? true) && (
                          <span
                            className="material-icons-round"
                            style={{ fontSize: "14px", color: "#10b981" }}
                            title="Verified Merchant"
                          >
                            verified
                          </span>
                        )}
                      </span>
                      <span className={styles.arrivalTime}>{formatTime(product.createdAt)}</span>
                    </div>
                  </Link>

                  <Link href={storeUrl} className={styles.arrivalVisitStoreBtn}>
                    Store
                  </Link>
                </div>

                {/* Product Media */}
                <Link href={`/products/${product.slug || product.id}`} className={styles.arrivalImgWrap}>
                  <img
                    src={product.image || product.images?.[0] || "/logo.png"}
                    alt={product.name}
                    className={styles.arrivalImg}
                    loading="lazy"
                  />
                  {discount && discount > 0 && (
                    <span className={styles.arrivalDiscountBadge}>-{discount}%</span>
                  )}
                  {product.inStock === false && (
                    <span className={styles.arrivalStockBadge} style={{ background: "#dc2626" }}>
                      Out of stock
                    </span>
                  )}
                </Link>

                {/* Card Body */}
                <div className={styles.arrivalBody}>
                  <span className={styles.arrivalCategory}>{product.category}</span>
                  <Link href={`/products/${product.slug || product.id}`} className={styles.arrivalTitle}>
                    {product.name}
                  </Link>

                  {/* Rating */}
                  <div className={styles.arrivalRatingRow}>
                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#f59e0b" }}>
                      star
                    </span>
                    <span style={{ fontWeight: 700, color: "#1e293b" }}>
                      {(Number(product.rating) || 5.0).toFixed(1)}
                    </span>
                    <span>({product.reviewsCount ?? 12})</span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span style={{ color: "#059669", fontWeight: 600 }}>Fast Shipping</span>
                  </div>

                  {/* Price */}
                  <div className={styles.arrivalPriceRow}>
                    <span className={styles.arrivalPrice}>{currency.format(product.price)}</span>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className={styles.arrivalOldPrice}>{currency.format(product.oldPrice)}</span>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className={styles.arrivalActionRow}>
                    <button
                      type="button"
                      className={styles.arrivalAddToCartBtn}
                      onClick={() => onAddToCart(product, 1)}
                      title="Add to cart"
                    >
                      <span className="material-icons-round" style={{ fontSize: "17px" }}>
                        add_shopping_cart
                      </span>
                      Add to Cart
                    </button>

                    <button
                      type="button"
                      className={styles.arrivalBuyNowBtn}
                      onClick={() => onBuyNow(product)}
                      title="Buy now with instant checkout"
                    >
                      <span className="material-icons-round" style={{ fontSize: "17px" }}>
                        bolt
                      </span>
                      Buy Now
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <span className="material-icons-round">inventory_2</span>
          </div>
          <h3 className={styles.emptyStateTitle}>No Products Found in Feed</h3>
          <p className={styles.emptyStateText}>
            {searchQuery || selectedCategory !== "ALL" || selectedStore !== "ALL"
              ? "No new drops matched your active filter settings. Try resetting your search or filter."
              : "Your followed stores have not posted any new products yet. Check back soon for fresh drops!"}
          </p>
          {(searchQuery || selectedCategory !== "ALL" || selectedStore !== "ALL") && (
            <button
              type="button"
              className={styles.visitStoreBtn}
              style={{ marginTop: "8px", width: "auto", padding: "8px 20px" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedStore("ALL");
                setSelectedCategory("ALL");
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                refresh
              </span>
              Reset Feed Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
