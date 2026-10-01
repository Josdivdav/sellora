"use client";

import { useState, useMemo, useEffect } from "react";
import type { Store } from "@/types/store";
import type { Order, OrderStatus } from "@/types/order";
import type { User } from "firebase/auth";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  orders?: Order[];
  onOrdersChange?: (orders: Order[]) => void;
  currency: Intl.NumberFormat;
  user: User | null;
  onShowToast: (msg: string) => void;
}

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "All Orders", value: "ALL" },
  { label: "Processing", value: "PROCESSING" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default function MerchantOrdersTab({
  store,
  orders: initialOrders,
  onOrdersChange,
  currency,
  user,
  onShowToast,
}: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders || []);
  const [isLoading, setIsLoading] = useState(!initialOrders || initialOrders.length === 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (initialOrders) {
      setOrders(initialOrders);
    }
  }, [initialOrders]);

  // Fetch orders from database
  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/store/orders", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const fetchedOrders: Order[] = data.orders || [];
            setOrders(fetchedOrders);
            onOrdersChange?.(fetchedOrders);
          }
        }
      } catch (err) {
        console.error("Error fetching merchant orders:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [user, onOrdersChange]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;
    setUpdatingOrderId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/store/orders", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      const updatedOrder: Order = data.order;
      const updatedList = orders.map((o) => (o.id === orderId ? updatedOrder : o));
      setOrders(updatedList);
      onOrdersChange?.(updatedList);

      const statusLabels: Record<OrderStatus, string> = {
        PROCESSING: "Processing",
        IN_TRANSIT: "In Transit",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
      };

      onShowToast(`Order #${updatedOrder.orderNumber} updated to ${statusLabels[newStatus]}`);
    } catch (err: any) {
      onShowToast(err.message || "Failed to update order");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        (order.shippingAddress?.fullName && order.shippingAddress.fullName.toLowerCase().includes(q)) ||
        (order.shippingAddress?.city && order.shippingAddress.city.toLowerCase().includes(q)) ||
        (order.items && order.items.some((it) => it.name.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  // Dynamic statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter((o) => o.status === "PROCESSING").length;
    const inTransit = orders.filter((o) => o.status === "IN_TRANSIT").length;
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;

    return [
      { label: "Total Orders", value: total, icon: "receipt_long", bg: "#eef2ff", color: "#4f46e5" },
      { label: "Processing", value: processing, icon: "schedule", bg: "#fffbeb", color: "#d97706" },
      { label: "In Transit", value: inTransit, icon: "local_shipping", bg: "#eff6ff", color: "#2563eb" },
      { label: "Delivered", value: delivered, icon: "check_circle", bg: "#ecfdf5", color: "#059669" },
    ];
  }, [orders]);

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case "PROCESSING":
        return styles.statusProcessing;
      case "IN_TRANSIT":
        return styles.statusInTransit;
      case "DELIVERED":
        return styles.statusDelivered;
      case "CANCELLED":
        return styles.statusCancelled;
      default:
        return "";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "PROCESSING":
        return "schedule";
      case "IN_TRANSIT":
        return "local_shipping";
      case "DELIVERED":
        return "check_circle";
      case "CANCELLED":
        return "cancel";
      default:
        return "info";
    }
  };

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Customer Orders</h2>
        <p className={styles.tabSubtitle}>Live orders placed for {store.name} products</p>
      </div>

      {/* Dynamic Stat pills */}
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

      {/* Filter and search bar */}
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by order #, customer name, city, product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
          <span className="material-icons-round" style={{ fontSize: "32px", animation: "spin 1s linear infinite" }}>
            sync
          </span>
          <p style={{ marginTop: "8px", fontSize: "14px" }}>Loading orders from database...</p>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className={styles.ordersList}>
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order.id;
            const formattedDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <div key={order.id} className={styles.orderCard}>
                {/* Header */}
                <div className={styles.orderHeader}>
                  <div className={styles.orderIdGroup}>
                    <span className={styles.orderNumber}>#{order.orderNumber}</span>
                    <span className={styles.orderDate}>
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        event
                      </span>
                      {formattedDate}
                    </span>
                  </div>

                  <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      {getStatusIcon(order.status)}
                    </span>
                    {order.status.replace("_", " ")}
                  </span>
                </div>

                {/* Customer Details */}
                <div className={styles.orderCustomerGrid}>
                  <div className={styles.customerMetaItem}>
                    <span className={styles.customerMetaLabel}>Customer</span>
                    <span className={styles.customerMetaValue}>
                      {order.shippingAddress?.fullName || "Customer"}
                    </span>
                  </div>

                  <div className={styles.customerMetaItem}>
                    <span className={styles.customerMetaLabel}>Contact Phone</span>
                    <span className={styles.customerMetaValue}>
                      {order.shippingAddress?.phone || "—"}
                    </span>
                  </div>

                  <div className={styles.customerMetaItem}>
                    <span className={styles.customerMetaLabel}>Destination</span>
                    <span className={styles.customerMetaValue}>
                      {order.shippingAddress?.city ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : "Nigeria"}
                    </span>
                  </div>

                  <div className={styles.customerMetaItem}>
                    <span className={styles.customerMetaLabel}>Payment</span>
                    <span className={styles.customerMetaValue}>
                      {order.payment?.method || "Debit Card"} ({order.payment?.status || "PAID"})
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className={styles.orderItemsList}>
                  {(order.items || []).map((item, idx) => (
                    <div key={item.productId || idx} className={styles.orderItemRow}>
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&q=70"}
                        alt={item.name}
                        className={styles.orderItemThumb}
                      />
                      <div className={styles.orderItemDetails}>
                        <h4 className={styles.orderItemName}>{item.name}</h4>
                        <div className={styles.orderItemMeta}>
                          Qty: <strong>{item.quantity}</strong>
                          {item.variant ? ` • Variant: ${item.variant}` : ""}
                          {item.category ? ` • ${item.category}` : ""}
                        </div>
                      </div>
                      <div className={styles.orderItemPrice}>
                        {currency.format(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Total & Fulfillment Actions */}
                <div className={styles.orderFooter}>
                  <div className={styles.orderTotalSummary}>
                    <span className={styles.orderTotalLabel}>Total Order Amount:</span>
                    <span className={styles.orderTotalAmount}>
                      {currency.format(order.pricing?.total ?? 0)}
                    </span>
                  </div>

                  <div className={styles.orderActionsRow}>
                    {order.status === "PROCESSING" && (
                      <>
                        <button
                          type="button"
                          className={styles.actionBtnPrimary}
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, "IN_TRANSIT")}
                        >
                          <span className="material-icons-round" style={{ fontSize: "16px" }}>
                            local_shipping
                          </span>
                          {isUpdating ? "Updating..." : "Dispatch / In Transit"}
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtnDanger}
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
                        >
                          <span className="material-icons-round" style={{ fontSize: "16px" }}>
                            cancel
                          </span>
                          Cancel Order
                        </button>
                      </>
                    )}

                    {order.status === "IN_TRANSIT" && (
                      <button
                        type="button"
                        className={styles.actionBtnPrimary}
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
                      >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>
                          check_circle
                        </span>
                        {isUpdating ? "Updating..." : "Confirm Delivered"}
                      </button>
                    )}

                    {order.status === "DELIVERED" && (
                      <span style={{ fontSize: "12px", color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>
                          verified
                        </span>
                        Order Delivered &amp; Completed
                      </span>
                    )}

                    {order.status === "CANCELLED" && (
                      <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>
                        {order.cancellationReason || "Order Cancelled"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredOrders.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <span className="material-icons-round">receipt_long</span>
          </div>
          <h3 className={styles.emptyTitle}>
            {search || statusFilter !== "ALL" ? "No matching orders found" : "No orders yet"}
          </h3>
          <p className={styles.emptyText}>
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search query or status filter to see customer orders."
              : "When customers purchase your products, their orders will appear here directly from the database. Share your storefront link to start receiving orders!"}
          </p>
          {(search || statusFilter !== "ALL") && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
              style={{ marginTop: "12px" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
