"use client";

import styles from "./favorites.module.css";
import type { Store } from "@/types/store";

interface StoreStatsHeaderProps {
  favoriteStores: Store[];
}

export default function StoreStatsHeader({
  favoriteStores,
}: StoreStatsHeaderProps) {
  const totalFollowed = favoriteStores.length;
  const verifiedCount = favoriteStores.filter((s) => s.isVerified).length;
  const topRatedCount = favoriteStores.filter((s) => s.rating >= 4.8).length;
  const totalProducts = favoriteStores.reduce(
    (acc, curr) => acc + (curr.productsCount || 0),
    0,
  );

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconRose}`}>
          <span className="material-icons-round">favorite</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{totalFollowed}</span>
          <span className={styles.statLabel}>Followed Stores</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
          <span className="material-icons-round">verified</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{verifiedCount}</span>
          <span className={styles.statLabel}>Verified Sellers</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
          <span className="material-icons-round">grade</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{topRatedCount}</span>
          <span className={styles.statLabel}>Top Rated (4.8★+)</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
          <span className="material-icons-round">local_offer</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{totalProducts}+</span>
          <span className={styles.statLabel}>Products in Catalog</span>
        </div>
      </div>
    </div>
  );
}
