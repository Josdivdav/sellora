"use client";

import Link from "next/link";
import styles from "./product.module.css";
import storesData from "@/data/stores.json";
import type { Store } from "@/types/store";

interface MerchantWidgetProps {
  authorName?: string;
  onFollowToggle?: () => void;
  isFollowing?: boolean;
}

export default function MerchantWidget({
  authorName,
  onFollowToggle,
  isFollowing,
}: MerchantWidgetProps) {
  const store = (storesData as Store[]).find(
    (s) => s.name.toLowerCase() === (authorName || "").toLowerCase(),
  );

  const formatFollowers = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return String(num);
  };

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>
        <span className="material-icons-round">verified</span>
        Merchant Profile
      </h3>

      <div className={styles.merchantBox}>
        <div className={styles.merchantHeader}>
          {store?.logo ? (
            <img
              src={store.logo}
              alt={store.name}
              className={styles.merchantAvatar}
            />
          ) : (
            <div
              className={styles.merchantAvatar}
              style={{
                background: "#eef1ff",
                color: "#2b6dff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              {(authorName || "S").charAt(0)}
            </div>
          )}

          <div>
            <div className={styles.merchantName}>
              {authorName || "Sellora Official Store"}
              {store?.isVerified && (
                <span
                  className="material-icons-round"
                  style={{ color: "#2b6dff", fontSize: "17px" }}
                >
                  verified
                </span>
              )}
            </div>
            <span className={styles.merchantCategory}>
              {store?.category || "Verified Merchant"} • {store?.location || "Nigeria"}
            </span>
          </div>
        </div>

        {store && (
          <div className={styles.merchantStats}>
            <div>
              <div className={styles.merchantStatVal}>{store.rating.toFixed(1)} ★</div>
              <div style={{ color: "#6b7280", fontSize: "11px" }}>
                {store.reviewsCount} Reviews
              </div>
            </div>
            <div>
              <div className={styles.merchantStatVal}>
                {formatFollowers(store.followersCount)}
              </div>
              <div style={{ color: "#6b7280", fontSize: "11px" }}>Followers</div>
            </div>
          </div>
        )}

        <p style={{ margin: 0, fontSize: "12.5px", color: "#4b5563", lineHeight: 1.45 }}>
          {store?.description ||
            "Authorized merchant selling authentic products directly on Sellora marketplace."}
        </p>

        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href={`/?search=${encodeURIComponent(authorName || "")}`}
            className={styles.merchantVisitBtn}
            style={{ flex: 1 }}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              storefront
            </span>
            Visit Store
          </Link>

          {onFollowToggle && (
            <button
              type="button"
              onClick={onFollowToggle}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: isFollowing ? "#fff1f2" : "#ffffff",
                color: isFollowing ? "#e11d48" : "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <span
                className="material-icons-round"
                style={{ fontSize: "16px", color: isFollowing ? "#e11d48" : "#6b7280" }}
              >
                {isFollowing ? "favorite" : "favorite_border"}
              </span>
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
