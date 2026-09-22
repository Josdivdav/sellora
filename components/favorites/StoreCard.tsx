"use client";

import styles from "./favorites.module.css";
import type { Store } from "@/types/store";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface StoreCardProps {
  store: Store;
  isFavorite: boolean;
  onToggleFavorite: (store: Store) => void;
  onVisitStore: (store: Store) => void;
  onMessageStore: (store: Store) => void;
  onProductClick: (store: Store, productId: string) => void;
}

export default function StoreCard({
  store,
  isFavorite,
  onToggleFavorite,
  onVisitStore,
  onMessageStore,
  onProductClick,
}: StoreCardProps) {
  const formatFollowers = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return String(num);
  };

  return (
    <article className={styles.storeCard}>
      {/* Banner */}
      <div className={styles.bannerWrap}>
        <img
          src={store.banner}
          alt={`${store.name} banner`}
          className={styles.bannerImg}
        />
        {store.badge && <span className={styles.badgeTag}>{store.badge}</span>}

        <button
          type="button"
          className={styles.favoriteBtn}
          onClick={() => onToggleFavorite(store)}
          aria-label={isFavorite ? "Unfollow store" : "Follow store"}
          title={isFavorite ? "Remove from favorite stores" : "Add to favorite stores"}
        >
          <span
            className="material-icons-round"
            style={{
              fontSize: "20px",
              color: isFavorite ? "#e11d48" : "#9ca3af",
            }}
          >
            {isFavorite ? "favorite" : "favorite_border"}
          </span>
        </button>
      </div>

      {/* Header with Logo */}
      <div className={styles.storeHeader}>
        <div className={styles.logoWrap}>
          <img
            src={store.logo}
            alt={`${store.name} logo`}
            className={styles.storeLogo}
          />
        </div>

        <div className={styles.headerMeta}>
          <h3 className={styles.storeName}>
            {store.name}
            {store.isVerified && (
              <span className={`material-icons-round ${styles.verifiedIcon}`} title="Verified Seller">
                verified
              </span>
            )}
          </h3>
          <span className={styles.storeCategory}>{store.category}</span>
        </div>
      </div>

      {/* Body */}
      <div className={styles.storeBody}>
        <p className={styles.storeDescription}>{store.description}</p>

        <div className={styles.metricsRow}>
          <div className={styles.metricItem}>
            <span className={styles.ratingText}>
              <span className="material-icons-round" style={{ fontSize: "15px" }}>
                star
              </span>
              {store.rating.toFixed(1)}
            </span>
            <span style={{ color: "#9ca3af", fontSize: "11px" }}>
              ({store.reviewsCount})
            </span>
          </div>

          <div className={styles.metricItem}>
            <span className="material-icons-round" style={{ fontSize: "15px", color: "#6b7280" }}>
              people
            </span>
            <span>{formatFollowers(store.followersCount)} followers</span>
          </div>

          <div className={styles.metricItem} title={store.deliverySpeed}>
            <span className="material-icons-round" style={{ fontSize: "15px", color: "#059669" }}>
              bolt
            </span>
            <span style={{ color: "#059669", fontWeight: 600 }}>Fast Delivery</span>
          </div>
        </div>

        {/* Tags */}
        {store.tags && store.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {store.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className={styles.tagPill}>
                #{tag}
              </span>
            ))}
            <span style={{ fontSize: "11px", color: "#9ca3af", alignSelf: "center" }}>
              • {store.location}
            </span>
          </div>
        )}

        {/* Top Products Preview Strip */}
        {store.topProducts && store.topProducts.length > 0 && (
          <div className={styles.productsPreviewSection}>
            <div className={styles.productsPreviewTitle}>Featured by Merchant</div>
            <div className={styles.productsPreviewGrid}>
              {store.topProducts.slice(0, 3).map((p : any) => (
                <div
                  key={p.id}
                  className={styles.previewProductCard}
                  onClick={() => onProductClick(store, p.id)}
                  title={`View ${p.name}`}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className={styles.previewProductImg}
                  />
                  <span className={styles.previewProductName}>{p.name}</span>
                  <span className={styles.previewProductPrice}>
                    {currency.format(p.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={styles.storeFooter}>
        <button
          type="button"
          className={styles.visitStoreBtn}
          onClick={() => onVisitStore(store)}
        >
          <span className="material-icons-round" style={{ fontSize: "17px" }}>
            storefront
          </span>
          Visit Storefront
        </button>

        <button
          type="button"
          className={styles.messageBtn}
          onClick={() => onMessageStore(store)}
          aria-label={`Message ${store.name}`}
          title="Message seller"
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>
            chat
          </span>
        </button>
      </div>
    </article>
  );
}
