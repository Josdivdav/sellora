"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import styles from "@/components/orders/orders.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter } from "next/navigation";
import type { Order } from "@/types/order";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import {
  HomeHeader,
  Sidebar,
  OrderCard,
  OrderTrackingModal,
  OrderDetailModal,
  CancelOrderModal,
  OrderStatsHeader,
  OrderFilterBar,
  type TabFilter,
  Toast,
} from "@/components/orders";
import { useCart } from "@/context/CartContext";

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cart, cartCount, addToCart, clearCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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

  // Fetch orders from Firestore DB
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    try {
      setOrdersLoading(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        window.dispatchEvent(new Event("sellora_session_expired"));
        router.replace("/");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } else {
        console.error("Failed to load orders:", res.statusText);
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching user orders from Firestore:", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/");
      } else {
        void fetchOrders();
      }
    }
  }, [authLoading, user, fetchOrders, router]);

  // Check for newly placed order query param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("newOrder") === "true") {
        setToast("Order placed successfully! Saved to your account.");
        window.history.replaceState({}, "", "/account/orders");
      }
    }
  }, []);

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
    const now = Date.now();

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
        const matchNumber = order.orderNumber?.toLowerCase().includes(query);
        const matchStore = order.store?.name?.toLowerCase().includes(query);
        const matchItems = order.items?.some((item) =>
          item.name?.toLowerCase().includes(query)
        );
        if (!matchNumber && !matchStore && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, currentTab, timeFilter, orderSearchQuery, headerSearch]);

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  const handleSignIn = () => {
    router.push("/login?redirect=/account/orders");
  };

  const handleCreateStore = () => {
    setSidebarOpen(false);
    router.push("/account/create-store");
  };

  const handleManageStore = () => {
    setSidebarOpen(false);
    router.push("/account/manage-store");
  };

  const handleBuyAgain = async (order: Order) => {
    try {
      for (const item of order.items) {
        await addToCart(item.productId, item.quantity);
      }
      setToast(`Added ${order.items.length} item(s) back to cart!`);
    } catch {
      setToast("Item added to cart");
    }
  };

  const handleConfirmCancel = async (orderId: string, reason: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "cancel", reason }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
        setToast("Order cancelled. Full refund has been initiated.");
      } else {
        setToast(data.error || "Failed to cancel order.");
      }
    } catch (err) {
      console.error("Cancel order error:", err);
      setToast("Failed to cancel order. Please try again.");
    }
  };

  const handleCheckoutCart = () => {
    router.push("/checkout");
  };

  const handleOrderHelp = (order: Order) => {
    setToast(
      `Support for ${order.orderNumber}: Call +234 1 800 735 567 or email support@${
        typeof window !== "undefined" ? window.location.hostname : "sellora.ng"
      }`
    );
  };

  const isPageLoading = authLoading || ordersLoading;

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          hasStore={hasStore}
          onCreateStore={handleCreateStore}
          manageStore={handleManageStore}
        />

        <main className={styles.main}>
          <div className={styles.pageHeading}>
            <div className={styles.titleRow}>
              <h1>
                <span className="material-icons-round">receipt_long</span>
                My Orders
              </h1>
              {!isPageLoading && user && (
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
                  {filteredOrders.length}{" "}
                  {filteredOrders.length === 1 ? "order" : "orders"} displayed
                </span>
              )}
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

          {/* Cart Checkout Banner if cart has items */}
          {cartCount > 0 && user && !isPageLoading && (
            <div className={styles.cartCheckoutBanner}>
              <div className={styles.cartCheckoutLeft}>
                <div className={styles.cartCheckoutIcon}>
                  <span className="material-icons-round">shopping_bag</span>
                </div>
                <div>
                  <h3 className={styles.cartCheckoutTitle}>
                    You have items ready for checkout
                  </h3>
                  <p className={styles.cartCheckoutSubtitle}>
                    Turn your active cart into an official order saved directly to your account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.cartCheckoutBtn}
                onClick={handleCheckoutCart}
                disabled={isCheckingOut}
              >
                <span className="material-icons-round">bolt</span>
                {isCheckingOut
                  ? "Placing Order..."
                  : `Checkout Now (${cartCount} ${
                      cartCount === 1 ? "item" : "items"
                    })`}
              </button>
            </div>
          )}

          {/* Main Orders Display */}
          {isPageLoading ? (
            <div className={styles.ordersSkeletonList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div
                      className={styles.skeletonLine}
                      style={{ height: "24px", width: "180px" }}
                    />
                    <div
                      className={styles.skeletonLine}
                      style={{ height: "24px", width: "90px" }}
                    />
                  </div>
                  <div
                    className={styles.skeletonLine}
                    style={{ height: "36px", width: "100%" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      className={styles.skeletonLine}
                      style={{
                        height: "64px",
                        width: "64px",
                        borderRadius: "12px",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        className={styles.skeletonLine}
                        style={{ height: "18px", width: "45%" }}
                      />
                      <div
                        className={styles.skeletonLine}
                        style={{ height: "14px", width: "25%" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !user ? null : filteredOrders.length > 0 ? (
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
                  ? `No orders matching "${
                      orderSearchQuery || headerSearch
                    }". Try adjusting your search or filters.`
                  : currentTab !== "ALL"
                  ? `You have no ${currentTab
                      .toLowerCase()
                      .replace("_", " ")} orders at this time.`
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
