"use client";

import styles from "@/app/home.module.css";

export interface StoreFilterItem {
  name: string;
  logo?: string;
  category?: string;
  count: number;
}

interface StoreFilterProps {
  stores: StoreFilterItem[];
  selectedStore: string;
  onSelectStore: (storeName: string) => void;
}

export default function StoreFilter({
  stores,
  selectedStore,
  onSelectStore,
}: StoreFilterProps) {
  const totalCount = stores.reduce((acc, s) => acc + s.count, 0);

  return (
    <section className={styles.storeFilterRow} aria-label="Stores Filter">
      <button
        type="button"
        className={`${styles.storePill} ${
          selectedStore === "All" ? styles.storePillActive : ""
        }`}
        onClick={() => onSelectStore("All")}
      >
        <span className="material-icons-round" style={{ fontSize: "16px" }}>
          storefront
        </span>
        <span>All Stores</span>
        <span className={styles.storePillCount}>{totalCount}</span>
      </button>

      {stores.map((s) => {
        const isSelected = selectedStore.toLowerCase() === s.name.toLowerCase();
        return (
          <button
            key={s.name}
            type="button"
            className={`${styles.storePill} ${
              isSelected ? styles.storePillActive : ""
            }`}
            onClick={() => onSelectStore(s.name)}
          >
            {s.logo ? (
              <img
                src={s.logo}
                alt={`${s.name} logo`}
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
            <span className={styles.storePillCount}>{s.count}</span>
          </button>
        );
      })}
    </section>
  );
}
