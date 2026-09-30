"use client";

import styles from "@/app/home.module.css";
import type { StoreFilterItem } from "./StoreFilter";

interface StoreQuickBarProps {
  stores: StoreFilterItem[];
  onSelectStore: (storeName: string) => void;
  onViewAllStores: () => void;
}

export default function StoreQuickBar({
  stores,
  onSelectStore,
  onViewAllStores,
}: StoreQuickBarProps) {
  if (stores.length === 0) return null;

  return (
    <div className={styles.storeQuickStrip}>
      <div className={styles.storeQuickHeader}>
        <div className={styles.storeQuickTitle}>
          <span className="material-icons-round" style={{ fontSize: "18px", color: "#2b6dff" }}>
            storefront
          </span>
          <span>Shop by Store</span>
        </div>
        <button
          type="button"
          className={styles.storeQuickViewAll}
          onClick={onViewAllStores}
        >
          View All Stores →
        </button>
      </div>

      <div className={styles.storeQuickList}>
        {stores.slice(0, 8).map((s) => (
          <button
            key={s.name}
            type="button"
            className={styles.storeQuickCard}
            onClick={() => onSelectStore(s.name)}
            title={`Browse items from ${s.name}`}
          >
            {s.logo ? (
              <img
                src={s.logo}
                alt={s.name}
                className={styles.storePillAvatar}
              />
            ) : (
              <span
                className={styles.storePillAvatar}
                style={{
                  display: "grid",
                  placeItems: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#2b6dff",
                  background: "#eef1ff",
                }}
              >
                {s.name.charAt(0)}
              </span>
            )}
            <span>{s.name}</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>({s.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
