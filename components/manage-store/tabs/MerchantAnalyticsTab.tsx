"use client";

import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  products: Product[];
  currency: Intl.NumberFormat;
}

export default function MerchantAnalyticsTab({ store, products, currency }: Props) {
  const catalogValue = products.reduce((acc, p) => acc + p.price * (p.stock ?? 1), 0);
  const avgRating =
    products.length > 0
      ? products.reduce((acc, p) => acc + (p.rating ?? 0), 0) / products.length
      : 0;

  const topProducts = [...products]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  const kpis = [
    { label: "Total Revenue", value: currency.format(0), icon: "payments", bg: "#ecfdf5", color: "#059669", note: "Coming soon" },
    { label: "Total Orders", value: "0", icon: "receipt_long", bg: "#eef2ff", color: "#4f46e5", note: "Coming soon" },
    { label: "Catalog Value", value: currency.format(catalogValue), icon: "account_balance_wallet", bg: "#fffbeb", color: "#d97706", note: "Live" },
    { label: "Avg. Rating", value: avgRating > 0 ? avgRating.toFixed(1) + " ★" : "—", icon: "star", bg: "#fff1f2", color: "#e11d48", note: products.length > 0 ? `${products.length} products` : "No products" },
  ];

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Analytics</h2>
        <p className={styles.tabSubtitle}>Performance overview for {store.name}</p>
      </div>

      {/* KPI cards */}
      <div className={styles.statRow}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.statPill}>
            <div className={styles.statPillIcon} style={{ background: k.bg, color: k.color }}>
              <span className="material-icons-round" style={{ fontSize: "20px" }}>{k.icon}</span>
            </div>
            <div>
              <div className={styles.statPillValue}>{k.value}</div>
              <div className={styles.statPillLabel}>{k.label}</div>
              <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "1px" }}>{k.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts coming soon */}
      <div className={styles.comingSoonCard}>
        <span className="material-icons-round" style={{ fontSize: "40px", color: "#a5b4fc" }}>bar_chart</span>
        <h3>Advanced Analytics Coming Soon</h3>
        <p>
          Revenue trends, conversion rates, visitor traffic, and sales breakdowns
          will be available here once your store starts receiving orders.
        </p>
      </div>

      {/* Top products by price */}
      {topProducts.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top Products by Price</h3>
          {topProducts.map((p, i) => (
            <div key={p.id} className={styles.topProductRow}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#9ca3af", width: "20px" }}>
                #{i + 1}
              </span>
              <img
                src={p.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&q=60"}
                alt={p.name}
                className={styles.topProductThumb}
              />
              <span className={styles.topProductName}>{p.name}</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                <span className={styles.topProductPrice}>{currency.format(p.price)}</span>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>Stock: {p.stock ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <span className="material-icons-round">bar_chart</span>
          </div>
          <h3 className={styles.emptyTitle}>No data yet</h3>
          <p className={styles.emptyText}>
            Add products to your store to start seeing analytics and performance metrics.
          </p>
        </div>
      )}
    </div>
  );
}
