"use client";

import { useState } from "react";
import type { Store } from "@/types/store";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  currency: Intl.NumberFormat;
  onShowToast: (msg: string) => void;
}

const STATUS_OPTIONS = ["All", "Pending", "In Transit", "Delivered", "Cancelled"];

export default function MerchantOrdersTab({ store, currency, onShowToast }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const stats = [
    { label: "Total Orders", value: 0, icon: "receipt_long", bg: "#eef2ff", color: "#4f46e5" },
    { label: "Pending", value: 0, icon: "schedule", bg: "#fffbeb", color: "#d97706" },
    { label: "In Transit", value: 0, icon: "local_shipping", bg: "#eff6ff", color: "#2563eb" },
    { label: "Delivered", value: 0, icon: "check_circle", bg: "#ecfdf5", color: "#059669" },
  ];

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Customer Orders</h2>
        <p className={styles.tabSubtitle}>Orders placed for your products by customers</p>
      </div>

      {/* Stat pills */}
      <div className={styles.statRow}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statPill}>
            <div className={styles.statPillIcon} style={{ background: s.bg, color: s.color }}>
              <span className="material-icons-round" style={{ fontSize: "20px" }}>{s.icon}</span>
            </div>
            <div>
              <div className={styles.statPillValue}>{s.value}</div>
              <div className={styles.statPillLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by order ID, product name, or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <span className="material-icons-round">receipt_long</span>
        </div>
        <h3 className={styles.emptyTitle}>No orders yet</h3>
        <p className={styles.emptyText}>
          When customers purchase your products, their orders will appear here.
          Share your store link to start getting sales!
        </p>
      </div>
    </div>
  );
}
