"use client";

import styles from "@/app/home.module.css";
import storesData from "@/data/stores.json";
import type { Store } from "@/types/store";

interface StoreBannerProps {
  storeName: string;
  productCount: number;
  onClear: () => void;
  store?: Store | null;
}

export default function StoreBanner({
  storeName,
  productCount,
  onClear,
  store: propStore,
}: StoreBannerProps) {
  const store =
    propStore ||
    (storesData as Store[]).find(
      (s) => s.name.toLowerCase() === storeName.toLowerCase()
    );

  return (
    <div className={styles.storeSpotlightBanner}>
      <div className={styles.storeSpotlightLeft}>
        {store?.logo ? (
          <img
            src={store.logo}
            alt={store.name}
            className={styles.storeSpotlightAvatar}
          />
        ) : (
          <div
            className={styles.storeSpotlightAvatar}
            style={{
              background: "#eef1ff",
              color: "#2b6dff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "20px",
            }}
          >
            {storeName.charAt(0)}
          </div>
        )}

        <div>
          <h2 className={styles.storeSpotlightName}>
            {storeName}
            {store?.isVerified && (
              <span
                className="material-icons-round"
                style={{ color: "#2b6dff", fontSize: "19px" }}
                title="Verified Merchant"
              >
                verified
              </span>
            )}
          </h2>

          <div className={styles.storeSpotlightMeta}>
            <span>
              {store?.category || "Merchant Store"} • {store?.location || "Nigeria"}
            </span>
            {store?.rating && (
              <span>
                <strong style={{ color: "#d97706" }}>★ {store.rating.toFixed(1)}</strong>
                {store.reviewsCount ? ` (${store.reviewsCount})` : ""}
              </span>
            )}
            <span>
              <strong>{productCount}</strong> item{productCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.storeSpotlightClear}
        onClick={onClear}
        title="View all stores"
      >
        <span className="material-icons-round" style={{ fontSize: "16px" }}>
          arrow_back
        </span>
        All Stores
      </button>
    </div>
  );
}
