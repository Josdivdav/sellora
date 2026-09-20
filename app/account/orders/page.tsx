"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "@/components/orders/orders.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter } from "next/navigation";
import initialOrdersData from "@/data/orders.json";
import type { Order } from "@/types/order";
import {
  HomeHeader,
  Sidebar,
  OrderCard,
  OrderTrackingModal,
  OrderDetailModal,
  CancelOrderModal,
  OrderStatsHeader,
  OrderFilterBar,
  Toast,
} from "@/components/orders";
import type { TabFilter } from "@/components/orders/OrderFilterBar";

const STORAGE_ORDERS_KEY = "sellora_mock_orders";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window === "undefined") return initialOrdersData as Order[];
    try {
      const stored = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return initialOrdersData as Order[];
  });

  const [headerSearch, setHeaderSearch] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [currentTab, setCurrentTab] = useState<TabFilter>("ALL");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Modals state
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);

  // Cart state
  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      return Object.values(cartObj).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0,
      );
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
        const count = Object.values(cartObj).reduce(
          (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
          0,
        );
        setCartCount(count);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Save orders to localStorage on mutation
  const persistOrders = (updated: Order[]) => {
    setOrders(updated);
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Compute status counts
  const statusCounts = useMemo<Record<TabFilter, number>>(() => {
    return {
      ALL: orders.length,
      IN_TRANSIT: orders.filter((o) => o.status === "IN_TRANSIT").length,
      PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
      DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    };
  }, [orders]);

  // Filter orders by tab, search, and time
  const filteredOrders = useMemo(() => {
    const query = (orderSearchQuery || headerSearch).trim().toLowerCase();
    const now = new Date("2026-09-20T19:00:00.000Z").getTime();

    return orders.filter((order) => {
      // Tab filter
      if (currentTab !== "ALL" && order.status !== currentTab) {
        return false;
      }

      // Time filter
      if (timeFilter !== "ALL") {
        const orderDate = new Date(order.createdAt).getTime();
        const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

        if (timeFilter === "30_DAYS" && diffDays > 30) return false;
        if (timeFilter === "3_MONTHS" && diffDays > 90) return false;
        if (timeFilter === "2026") {
          const yr = new Date(order.createdAt).getFullYear();
          if (yr !== 2026) return false;
        }
      }

      // Search query (Order #, item name, store name)
      if (query) {
        const matchNumber = order.orderNumber.toLowerCase().includes(query);
        const matchStore = order.store.name.toLowerCase().includes(query);
        const matchItems = order.items.some((item) =>
          item.name.toLowerCase().includes(query),
        );
        if (!matchNumber && !matchStore && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, currentTab, timeFilter, orderSearchQuery, headerSearch]);

  const handleSignOut = async () => {
    const success = await SignOut();
    if (success) {
      router.refresh();
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleCreateStore = () => {
    setSidebarOpen(false);
    setToast("Create store is coming soon");
  };

  const handleBuyAgain = (order: Order) => {
    try {
      const existingCart = JSON.parse(
        localStorage.getItem("sellora_cart") || "{}",
      );
      order.items.forEach((item) => {
        existingCart[item.productId] =
          (existingCart[item.productId] || 0) + item.quantity;
      });
      localStorage.setItem("sellora_cart", JSON.stringify(existingCart));
      const newCount = Object.values(existingCart).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0,
      );
      setCartCount(newCount);
      setToast(`Added ${order.items.length} item(s) back to cart!`);
    } catch {
      setToast("Item added to cart");
    }
  };

  const handleConfirmCancel = (orderId: string, reason: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "CANCELLED" as const,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason,
          payment: {
            ...o.payment,
            status: "REFUNDED" as const,
          },
          trackingEvents: [
            ...o.trackingEvents,
            {
              status: "CANCELLED" as const,
              title: "Order Cancelled & Refund Initiated",
              description: `Reason: ${reason}. Full refund processed to ${o.payment.method}.`,
              location: "Sellora Payment Operations",
              timestamp: new Date().toISOString(),
              completed: true,
              current: true,
            },
          ],
        };
      }
      return o;
    });

    persistOrders(updated);
    setToast("Order cancelled. Full refund has been initiated.");
  };

  const handleOrderHelp = (order: Order) => {
    setToast(
      `Support for ${order.orderNumber}: Call +234 1 800 735 567 or email support@sellora.ng`,
    );
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onCreateStore={handleCreateStore}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
        />

        <main className={styles.main}>
          <div className={styles.pageHeading}>
            <div className={styles.titleRow}>
              <h1>
                <span className="material-icons-round">receipt_long</span>
                My Orders
              </h1>
              <span
                style={{
                  fontSize: "13px",
                  background: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "50px",
                  border: "1px solid #e5e7eb",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} displayed
              </span>
            </div>
            <p className={styles.subtitle}>
              Track deliveries, view itemized receipts, and manage your e-commerce purchases.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <OrderStatsHeader orders={orders} />

          {/* Filter Bar */}
          <OrderFilterBar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            searchQuery={orderSearchQuery}
            onSearchChange={setOrderSearchQuery}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            counts={statusCounts}
          />

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className={styles.ordersList}>
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onTrack={(o) => setTrackingOrder(o)}
                  onViewDetails={(o) => setDetailOrder(o)}
                  onCancel={(o) => setCancellingOrder(o)}
                  onBuyAgain={handleBuyAgain}
                  onHelp={handleOrderHelp}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <span className="material-icons-round">inventory_2</span>
              </div>
              <h3 className={styles.emptyStateTitle}>No orders found</h3>
              <p className={styles.emptyStateText}>
                {orderSearchQuery || headerSearch
                  ? `No orders matching "${orderSearchQuery || headerSearch}". Try adjusting your search or filters.`
                  : currentTab !== "ALL"
                  ? `You have no ${currentTab.toLowerCase().replace("_", " ")} orders at this time.`
                  : "You haven't placed any orders yet. Start exploring verified stores today!"}
              </p>
              {orderSearchQuery || headerSearch || currentTab !== "ALL" ? (
                <button
                  type="button"
                  className={styles.emptyStateBtn}
                  onClick={() => {
                    setCurrentTab("ALL");
                    setOrderSearchQuery("");
                    setHeaderSearch("");
                    setTimeFilter("ALL");
                  }}
                >
                  <span className="material-icons-round">refresh</span>
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.emptyStateBtn}
                  onClick={() => router.push("/")}
                >
                  <span className="material-icons-round">storefront</span>
                  Browse Products
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {trackingOrder && (
        <OrderTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onBuyAgain={handleBuyAgain}
        />
      )}

      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirmCancel={handleConfirmCancel}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
