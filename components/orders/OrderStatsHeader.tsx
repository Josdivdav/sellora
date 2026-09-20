"use client";

import styles from "./orders.module.css";
import type { Order } from "@/types/order";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface OrderStatsHeaderProps {
  orders: Order[];
}

export default function OrderStatsHeader({ orders }: OrderStatsHeaderProps) {
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => o.status === "IN_TRANSIT" || o.status === "PROCESSING",
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const totalSaved = orders.reduce(
    (acc, curr) => acc + (curr.pricing.discount || 0),
    0,
  );

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconWrapBlue}`}>
          <span className="material-icons-round">receipt_long</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{totalOrders}</span>
          <span className={styles.statLabel}>Total Orders</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconWrapAmber}`}>
          <span className="material-icons-round">local_shipping</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{activeOrders}</span>
          <span className={styles.statLabel}>Active & In-Transit</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconWrapGreen}`}>
          <span className="material-icons-round">task_alt</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{deliveredOrders}</span>
          <span className={styles.statLabel}>Delivered Packages</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIconWrap} ${styles.statIconWrapPurple}`}>
          <span className="material-icons-round">savings</span>
        </div>
        <div className={styles.statInfo}>
          <span className={styles.statValue}>{currency.format(totalSaved)}</span>
          <span className={styles.statLabel}>Savings from Deals</span>
        </div>
      </div>
    </div>
  );
}
