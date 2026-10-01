"use client";

import { useMemo } from "react";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  products: Product[];
  orders?: Order[];
  currency: Intl.NumberFormat;
}

export default function MerchantAnalyticsTab({
  store,
  products,
  orders = [],
  currency,
}: Props) {
  // Catalog Valuation
  const catalogValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.price * (p.stock ?? 1), 0);
  }, [products]);

  // Total in-stock products
  const activeProductsCount = useMemo(() => {
    return products.filter((p) => (p.stock ?? 0) > 0).length;
  }, [products]);

  // Real Order Analytics
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "CANCELLED");
  }, [orders]);

  // Real Revenue
  const totalRevenue = useMemo(() => {
    return activeOrders.reduce((acc, order) => {
      // Sum store items in order
      const storeItems = (order.items || []).filter(
        (it) => it.storeId === store.id || it.storeName === store.name
      );
      if (storeItems.length > 0) {
        return acc + storeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      }
      return acc + (order.pricing?.total ?? 0);
    }, 0);
  }, [activeOrders, store.id, store.name]);

  // Total Units Sold
  const totalUnitsSold = useMemo(() => {
    return activeOrders.reduce((acc, order) => {
      const storeItems = (order.items || []).filter(
        (it) => it.storeId === store.id || it.storeName === store.name
      );
      const itemsToCount = storeItems.length > 0 ? storeItems : order.items || [];
      return acc + itemsToCount.reduce((sum, it) => sum + (it.quantity ?? 1), 0);
    }, 0);
  }, [activeOrders, store.id, store.name]);

  // Average Order Value
  const avgOrderValue = useMemo(() => {
    if (activeOrders.length === 0) return 0;
    return totalRevenue / activeOrders.length;
  }, [totalRevenue, activeOrders.length]);

  // Average Product/Store Rating
  const avgRating = useMemo(() => {
    if (store.rating && store.rating > 0) return store.rating;
    if (products.length > 0) {
      return products.reduce((acc, p) => acc + (p.rating ?? 5.0), 0) / products.length;
    }
    return 5.0;
  }, [store.rating, products]);

  // Status Breakdown
  const statusCounts = useMemo(() => {
    const counts = {
      PROCESSING: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  // Category Distribution
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    products.forEach((p) => {
      const cat = p.category || "General";
      const existing = map.get(cat) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += p.price * (p.stock ?? 1);
      map.set(cat, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [products]);

  // Top Products (by price / inventory or by sales)
  const topProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => (b.price * (b.stock ?? 1)) - (a.price * (a.stock ?? 1)))
      .slice(0, 5);
  }, [products]);

  const kpis = [
    {
      label: "Total Sales Revenue",
      value: currency.format(totalRevenue),
      icon: "payments",
      bg: "#ecfdf5",
      color: "#059669",
      note: orders.length > 0 ? `${activeOrders.length} active orders` : "Awaiting first order",
    },
    {
      label: "Customer Orders",
      value: orders.length.toString(),
      icon: "receipt_long",
      bg: "#eef2ff",
      color: "#4f46e5",
      note: `${statusCounts.DELIVERED} fulfilled`,
    },
    {
      label: "Units Sold",
      value: totalUnitsSold.toLocaleString(),
      icon: "shopping_bag",
      bg: "#f5f3ff",
      color: "#7c3aed",
      note: totalRevenue > 0 ? `Avg order: ${currency.format(avgOrderValue)}` : "Live volume",
    },
    {
      label: "Catalog Value",
      value: currency.format(catalogValue),
      icon: "account_balance_wallet",
      bg: "#fffbeb",
      color: "#d97706",
      note: `${activeProductsCount} products active`,
    },
    {
      label: "Followers & Rating",
      value: `${avgRating.toFixed(1)} ★`,
      icon: "groups",
      bg: "#fff1f2",
      color: "#e11d48",
      note: `${(store.followersCount ?? 0).toLocaleString()} followers`,
    },
  ];

  const totalOrdersCount = orders.length || 1;
  const processingPct = Math.round((statusCounts.PROCESSING / totalOrdersCount) * 100);
  const transitPct = Math.round((statusCounts.IN_TRANSIT / totalOrdersCount) * 100);
  const deliveredPct = Math.round((statusCounts.DELIVERED / totalOrdersCount) * 100);
  const cancelledPct = Math.round((statusCounts.CANCELLED / totalOrdersCount) * 100);

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Store Analytics &amp; Performance</h2>
        <p className={styles.tabSubtitle}>Live database metrics and sales tracking for {store.name}</p>
      </div>

      {/* KPI Row */}
      <div className={styles.statRow}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.statPill}>
            <div className={styles.statPillIcon} style={{ background: k.bg, color: k.color }}>
              <span className="material-icons-round" style={{ fontSize: "20px" }}>{k.icon}</span>
            </div>
            <div>
              <div className={styles.statPillValue}>{k.value}</div>
              <div className={styles.statPillLabel}>{k.label}</div>
              <div style={{ fontSize: "10.5px", color: "#9ca3af", marginTop: "2px" }}>{k.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Fulfillment Breakdown */}
      <div className={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 className={styles.cardTitle} style={{ margin: 0 }}>
            Order Fulfillment Pipeline
          </h3>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
            {orders.length} Total Orders Received
          </span>
        </div>

        {orders.length > 0 ? (
          <div className={styles.statusBreakdownContainer}>
            <div className={styles.breakdownBarTrack}>
              {processingPct > 0 && (
                <div
                  className={styles.breakdownSegment}
                  style={{ width: `${processingPct}%`, background: "#f59e0b" }}
                  title={`Processing: ${statusCounts.PROCESSING} (${processingPct}%)`}
                />
              )}
              {transitPct > 0 && (
                <div
                  className={styles.breakdownSegment}
                  style={{ width: `${transitPct}%`, background: "#3b82f6" }}
                  title={`In Transit: ${statusCounts.IN_TRANSIT} (${transitPct}%)`}
                />
              )}
              {deliveredPct > 0 && (
                <div
                  className={styles.breakdownSegment}
                  style={{ width: `${deliveredPct}%`, background: "#10b981" }}
                  title={`Delivered: ${statusCounts.DELIVERED} (${deliveredPct}%)`}
                />
              )}
              {cancelledPct > 0 && (
                <div
                  className={styles.breakdownSegment}
                  style={{ width: `${cancelledPct}%`, background: "#ef4444" }}
                  title={`Cancelled: ${statusCounts.CANCELLED} (${cancelledPct}%)`}
                />
              )}
            </div>

            <div className={styles.breakdownLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#f59e0b" }} />
                <span>Processing ({statusCounts.PROCESSING})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#3b82f6" }} />
                <span>In Transit ({statusCounts.IN_TRANSIT})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#10b981" }} />
                <span>Delivered ({statusCounts.DELIVERED})</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                <span>Cancelled ({statusCounts.CANCELLED})</span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "#64748b", margin: "8px 0 0" }}>
            No customer orders received yet. Once customers purchase items from your storefront, fulfillment progress will be tracked here.
          </p>
        )}
      </div>

      {/* Category Breakdown */}
      {categoryStats.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Inventory by Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {categoryStats.map(([cat, data]) => (
              <div
                key={cat}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{cat}</div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  {data.count} items ({Math.round((data.count / (products.length || 1)) * 100)}% of catalog)
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0b1230", marginTop: "6px" }}>
                  {currency.format(data.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top Catalog Assets</h3>
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={styles.topProductName}>{p.name}</span>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  {p.category} • SKU: {p.sku || "—"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                <span className={styles.topProductPrice}>{currency.format(p.price)}</span>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  Stock: <strong>{p.stock ?? 0}</strong> ({currency.format(p.price * (p.stock ?? 1))})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && orders.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <span className="material-icons-round">analytics</span>
          </div>
          <h3 className={styles.emptyTitle}>No Analytics Available</h3>
          <p className={styles.emptyText}>
            Add products to your store catalog to track real-time inventory valuations, customer orders, and sales performance.
          </p>
        </div>
      )}
    </div>
  );
}
