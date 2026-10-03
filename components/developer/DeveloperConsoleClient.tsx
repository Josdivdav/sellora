"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import styles from "./developer.module.css";
import { useAuth } from "@/context/AuthContext";
import { getAdminConsoleUrl } from "@/lib/storeUrl";

type TabKey = "feed" | "users" | "stores" | "orders" | "conversations" | "system";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  if (isNaN(diffMs)) return "Recently";

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay}d ago`;
  return past.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

export default function DeveloperConsoleClient() {
  const { user, loading: isAuthLoading } = useAuth();

  // Authentication State
  const [devKey, setDevKey] = useState<string>("");
  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gateError, setGateError] = useState("");
  const [isAdminHost, setIsAdminHost] = useState(false);
  const [adminUrl, setAdminUrl] = useState("");

  // Data State
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"ALL" | "MERCHANTS" | "BUYERS">("ALL");
  const [storeFilter, setStoreFilter] = useState<"ALL" | "VERIFIED" | "PREMIUM">("ALL");
  const [orderFilter, setOrderFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Action status
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Check stored key and admin host on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.host.toLowerCase();
      setIsAdminHost(host.startsWith("admin."));
      setAdminUrl(getAdminConsoleUrl(window.location.host));
    }
    const stored = sessionStorage.getItem("sellora_developer_key");
    if (stored) {
      setDevKey(stored);
      setIsUnlocked(true);
    }
  }, []);

  // Check if logged-in user is admin
  useEffect(() => {
    if (user && !isUnlocked) {
      const email = user.email?.toLowerCase();
      if (email === "joshuadivine985@gmail.com") {
        if (typeof document !== "undefined") {
          document.cookie = "sellora_dev_auth=1; path=/; max-age=604800; SameSite=Lax";
        }
        setIsUnlocked(true);
      }
    }
  }, [user, isUnlocked]);

  // Fetch developer inspection data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (devKey) {
        headers["x-developer-key"] = devKey;
      }
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch("/api/developer/inspect", { headers });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          setIsUnlocked(false);
          setGateError(json.error || "Authentication failed. Please verify passcode.");
        }
        throw new Error(json.error || "Failed to load developer stats.");
      }

      setData(json);
      setIsUnlocked(true);
      if (typeof document !== "undefined") {
        document.cookie = "sellora_dev_auth=1; path=/; max-age=604800; SameSite=Lax";
      }
      if (devKey) {
        sessionStorage.setItem("sellora_developer_key", devKey);
      }
    } catch (err: any) {
      console.error("[Developer Console] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [devKey, user]);

  // Initial load once unlocked
  useEffect(() => {
    if (isUnlocked) {
      void fetchData();
    }
  }, [isUnlocked, fetchData]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh || !isUnlocked) return;
    const interval = setInterval(() => {
      void fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, isUnlocked, fetchData]);

  // Handle Gate Unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setGateError("Please enter the developer passcode.");
      return;
    }
    setGateError("");
    setDevKey(inputKey.trim());
    setIsUnlocked(true);
  };

  const handleLock = () => {
    if (typeof document !== "undefined") {
      document.cookie = "sellora_dev_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    sessionStorage.removeItem("sellora_developer_key");
    setDevKey("");
    setIsUnlocked(false);
    setData(null);
  };

  // Perform developer quick administrative action
  const handleAction = async (action: string, payload: any, id: string) => {
    setActionLoadingId(id);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (devKey) headers["x-developer-key"] = devKey;
      if (user) {
        const token = await user.getIdToken();
        headers["authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/developer/action", {
        method: "POST",
        headers,
        body: JSON.stringify({ action, payload }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Action failed");

      showToast(resJson.message || "Operation updated successfully!");
      await fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to execute action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Dispatch Test Email
  const handleTestEmail = async () => {
    setEmailSending(true);
    try {
      const res = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: data?.systemHealth?.adminEmail || "joshuadivine985@gmail.com" }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Test email dispatch failed");
      showToast(resData.message || "Test email successfully delivered!");
    } catch (err: any) {
      showToast(err.message || "Failed to send test email.");
    } finally {
      setEmailSending(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  // Export Users CSV
  const exportUsersCSV = () => {
    if (!data?.users?.length) return;
    const headers = "UID,Name,Email,Has Store,Created At,Cart Items,Wishlist Items\n";
    const rows = data.users
      .map(
        (u: any) =>
          `"${u.uid}","${u.displayName}","${u.email}","${u.has_store ? "Yes" : "No"}","${u.createdAt || ""}","${u.cartCount}","${u.wishlistCount}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellora-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Exported users as CSV!");
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    let list = data.users;
    if (userFilter === "MERCHANTS") list = list.filter((u: any) => u.has_store);
    if (userFilter === "BUYERS") list = list.filter((u: any) => !u.has_store);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u: any) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.uid?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.users, userFilter, searchQuery]);

  // Filtered Stores
  const filteredStores = useMemo(() => {
    if (!data?.stores) return [];
    let list = data.stores;
    if (storeFilter === "VERIFIED") list = list.filter((s: any) => s.isVerified);
    if (storeFilter === "PREMIUM") list = list.filter((s: any) => s.isPremium || s.plan === "Premium");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.slug?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.ownerEmail?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.stores, storeFilter, searchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    let list = data.orders;
    if (orderFilter !== "ALL") {
      list = list.filter((o: any) => o.status === orderFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o: any) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.trackingNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerEmail?.toLowerCase().includes(q) ||
          o.storeName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.orders, orderFilter, searchQuery]);

  // Filtered Conversations
  const filteredConvs = useMemo(() => {
    if (!data?.conversations) return [];
    let list = data.conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c: any) =>
          c.buyerName?.toLowerCase().includes(q) ||
          c.storeName?.toLowerCase().includes(q) ||
          c.productName?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.conversations, searchQuery]);

  // ── Render Developer Access Gate if not unlocked ──
  if (!isUnlocked) {
    return (
      <div className={styles.gateContainer}>
        <div className={styles.gateCard}>
          <div className={styles.gateIconWrap}>
            <span className="material-icons-round">terminal</span>
          </div>

          <h1 className={styles.gateTitle}>Developer Operations Console</h1>
          <p className={styles.gateDesc}>
            Restricted developer portal for inspecting real-time platform user signups, merchant stores, live transactions, and buyer inquiries.
          </p>

          {gateError && (
            <div className={styles.gateError}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>error</span>
              <span>{gateError}</span>
            </div>
          )}

          <form className={styles.gateForm} onSubmit={handleUnlock}>
            <div className={styles.gateInputGroup}>
              <label className={styles.gateLabel}>Developer Passcode</label>
              <div className={styles.gateInputWrapper}>
                <input
                  type={showKey ? "text" : "password"}
                  className={styles.gateInput}
                  placeholder="Enter passcode (e.g. sellora-dev-2026)"
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setGateError("");
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.gateToggleVisibility}
                  onClick={() => setShowKey(!showKey)}
                  aria-label="Toggle passcode visibility"
                >
                  <span className="material-icons-round" style={{ fontSize: "20px" }}>
                    {showKey ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button type="submit" className={styles.gateSubmitBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>lock_open</span>
              <span>Authenticate &amp; Open Console</span>
            </button>
          </form>

          <div className={styles.gateDivider}>or developer account</div>

          {user ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
              Signed in as <strong>{user.email}</strong>
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className={styles.gateAltBtn}
                  onClick={() => {
                    setDevKey("sellora-dev-2026");
                    setIsUnlocked(true);
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>verified_user</span>
                  <span>Enter with Current Session</span>
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login?redirect=/developer" className={styles.gateAltBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>account_circle</span>
              <span>Sign In with Platform Administrator Email</span>
            </Link>
          )}

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Link href="/" style={{ color: "#64748b", fontSize: "12px", textDecoration: "none" }}>
              ← Return to Sellora Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalUsers: 0,
    usersWithStore: 0,
    pureBuyers: 0,
    totalStores: 0,
    verifiedStores: 0,
    premiumStores: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalGMV: 0,
    totalConversations: 0,
    totalReferrals: 0,
  };

  return (
    <div className={styles.page}>
      {/* ── Top Navigation Bar ── */}
      <header className={styles.topNav}>
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandLogo}>
              <span className="material-icons-round">terminal</span>
            </div>
            <div className={styles.brandTitleGroup}>
              <div className={styles.brandTitle}>
                <span>Sellora Developer Console</span>
                <span className={styles.brandBadge}>SUPERADMIN</span>
              </div>
              <span className={styles.brandSub}>
                Platform User &amp; Store Activity Monitor
              </span>
            </div>
          </div>

          <div className={styles.topNavActions}>
            {isAdminHost ? (
              <div className={styles.liveIndicator} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", borderColor: "rgba(99, 102, 241, 0.3)" }}>
                <span className="material-icons-round" style={{ fontSize: "14px" }}>shield</span>
                <span>ADMIN SUBDOMAIN</span>
              </div>
            ) : (
              <a
                href={adminUrl || "https://admin.devico.online"}
                className={styles.navActionBtn}
                style={{ borderColor: "rgba(99, 102, 241, 0.4)", color: "#a5b4fc" }}
                title="Switch to secret standalone admin subdomain"
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>domain</span>
                <span>admin.[domain]</span>
              </a>
            )}

            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              <span>LIVE CLUSTER</span>
            </div>

            <button
              type="button"
              className={`${styles.navActionBtn} ${autoRefresh ? styles.navActionBtnActive : ""}`}
              onClick={() => {
                setAutoRefresh(!autoRefresh);
                showToast(autoRefresh ? "Auto-refresh disabled" : "Auto-refresh enabled (every 30s)");
              }}
              title="Toggle auto refresh every 30 seconds"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                {autoRefresh ? "sync" : "sync_disabled"}
              </span>
              <span>{autoRefresh ? "Auto (30s)" : "Auto Off"}</span>
            </button>

            <button
              type="button"
              className={styles.navActionBtn}
              onClick={() => {
                void fetchData();
                showToast("Refreshed platform inspection data!");
              }}
              disabled={isLoading}
              title="Refresh database records immediately"
            >
              <span
                className="material-icons-round"
                style={{
                  fontSize: "16px",
                  animation: isLoading ? "spin 1s linear infinite" : "none",
                }}
              >
                refresh
              </span>
              <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link href="/" className={styles.navActionBtn} target="_blank" title="Open marketplace store in new tab">
              <span className="material-icons-round" style={{ fontSize: "16px" }}>storefront</span>
              <span>Marketplace</span>
            </Link>

            <button
              type="button"
              className={styles.navActionBtn}
              onClick={handleLock}
              style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
              title="Lock console session"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>logout</span>
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className={styles.container}>
        {/* ── Top Metric Cards Ribbon ── */}
        <section className={styles.metricsGrid}>
          {/* Total Users */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
              <span className="material-icons-round">people</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Total Users</span>
              <span className={styles.metricValue}>{summary.totalUsers.toLocaleString()}</span>
              <span className={styles.metricSub}>
                {summary.usersWithStore} Merchants • {summary.pureBuyers} Buyers
              </span>
            </div>
          </div>

          {/* Total Stores */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <span className="material-icons-round">storefront</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Total Stores</span>
              <span className={styles.metricValue}>{summary.totalStores.toLocaleString()}</span>
              <span className={styles.metricSub}>
                {summary.verifiedStores} Verified • {summary.premiumStores} Premium
              </span>
            </div>
          </div>

          {/* Total Products */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
              <span className="material-icons-round">inventory_2</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Total Products</span>
              <span className={styles.metricValue}>{summary.totalProducts.toLocaleString()}</span>
              <span className={styles.metricSub}>
                In {data?.categories?.length || 0} Categories
              </span>
            </div>
          </div>

          {/* Platform GMV & Orders */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
              <span className="material-icons-round">account_balance_wallet</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Platform GMV</span>
              <span className={styles.metricValue}>{currency.format(summary.totalGMV)}</span>
              <span className={styles.metricSub}>
                {summary.totalOrders} Orders Placed
              </span>
            </div>
          </div>

          {/* In-App Chat Inquiries */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(236, 72, 153, 0.15)", color: "#f472b6" }}>
              <span className="material-icons-round">forum</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Customer Inquiries</span>
              <span className={styles.metricValue}>{summary.totalConversations.toLocaleString()}</span>
              <span className={styles.metricSub}>Buyer-Merchant Threads</span>
            </div>
          </div>

          {/* Referrals */}
          <div className={styles.metricCard}>
            <div className={styles.metricIconWrap} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
              <span className="material-icons-round">card_giftcard</span>
            </div>
            <div className={styles.metricDetails}>
              <span className={styles.metricLabel}>Merchant Referrals</span>
              <span className={styles.metricValue}>{summary.totalReferrals.toLocaleString()}</span>
              <span className={styles.metricSub}>Growth Network</span>
            </div>
          </div>
        </section>

        {/* ── Navigation Tabs ── */}
        <nav className={styles.tabsBar} aria-label="Developer tabs">
          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "feed" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("feed"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>bolt</span>
            <span>Live Activity Stream</span>
            <span className={styles.tabBadge}>{data?.recentActivities?.length || 0}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "users" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>group</span>
            <span>Users Directory</span>
            <span className={styles.tabBadge}>{summary.totalUsers}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "stores" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("stores"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>store</span>
            <span>Stores &amp; Merchants</span>
            <span className={styles.tabBadge}>{summary.totalStores}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "orders" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("orders"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>receipt_long</span>
            <span>Orders &amp; GMV</span>
            <span className={styles.tabBadge}>{summary.totalOrders}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "conversations" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("conversations"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>chat</span>
            <span>Chat Inquiries</span>
            <span className={styles.tabBadge}>{summary.totalConversations}</span>
          </button>

          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === "system" ? styles.tabItemActive : ""}`}
            onClick={() => { setActiveTab("system"); setSearchQuery(""); }}
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>memory</span>
            <span>System Health</span>
          </button>
        </nav>

        {/* ── TAB 1: LIVE ACTIVITY FEED ── */}
        {activeTab === "feed" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#34d399" }}>stream</span>
                  <span>Unified Platform Activity Stream</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  Real-time event feed of user registrations, store creations, orders, and customer messages.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={styles.tableActionBtn}
                  onClick={() => fetchData()}
                  disabled={isLoading}
                >
                  <span className="material-icons-round" style={{ fontSize: "15px" }}>refresh</span>
                  <span>Sync Events</span>
                </button>
              </div>
            </div>

            {(!data?.recentActivities || data.recentActivities.length === 0) ? (
              <div className={styles.emptyState}>
                <span className={`material-icons-round ${styles.emptyIcon}`}>hourglass_empty</span>
                <strong>No activities recorded yet</strong>
                <span>New events will appear here as users browse, sign up, and create stores.</span>
              </div>
            ) : (
              <div className={styles.timeline}>
                {data.recentActivities.map((act: any) => {
                  let icon = "info";
                  let bg = "rgba(59, 130, 246, 0.15)";
                  let color = "#60a5fa";

                  if (act.type === "USER_SIGNUP") {
                    icon = "person_add";
                    bg = "rgba(16, 185, 129, 0.15)";
                    color = "#34d399";
                  } else if (act.type === "STORE_CREATED") {
                    icon = "storefront";
                    bg = "rgba(168, 85, 247, 0.15)";
                    color = "#c084fc";
                  } else if (act.type === "ORDER_PLACED") {
                    icon = "shopping_cart";
                    bg = "rgba(245, 158, 11, 0.15)";
                    color = "#fbbf24";
                  } else if (act.type === "CHAT_INQUIRY") {
                    icon = "chat_bubble";
                    bg = "rgba(236, 72, 153, 0.15)";
                    color = "#f472b6";
                  }

                  return (
                    <div key={act.id} className={styles.timelineItem}>
                      <div className={styles.timelineLeft}>
                        <div className={styles.timelineIcon} style={{ background: bg, color }}>
                          <span className="material-icons-round">{icon}</span>
                        </div>
                        <div className={styles.timelineText}>
                          <span className={styles.timelineTitle}>{act.title}</span>
                          <span className={styles.timelineSub}>{act.subtitle}</span>
                        </div>
                      </div>

                      <div className={styles.timelineRight}>
                        {act.badge && (
                          <span className={styles.badge} style={{ background: bg, color, fontSize: "11px" }}>
                            {act.badge}
                          </span>
                        )}
                        <span className={styles.timelineTime}>{timeAgo(act.time)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: USERS DIRECTORY ── */}
        {activeTab === "users" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#60a5fa" }}>group</span>
                  <span>Registered Users ({filteredUsers.length} of {summary.totalUsers})</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  Inspect all authenticated users in Firestore with their store ownership and shopping cart activity.
                </p>
              </div>

              <button type="button" className={styles.tableActionBtn} onClick={exportUsersCSV}>
                <span className="material-icons-round" style={{ fontSize: "15px" }}>download</span>
                <span>Export CSV</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search user by name, email, or UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterChips}>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${userFilter === "ALL" ? styles.chipBtnActive : ""}`}
                  onClick={() => setUserFilter("ALL")}
                >
                  All Users ({summary.totalUsers})
                </button>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${userFilter === "MERCHANTS" ? styles.chipBtnActive : ""}`}
                  onClick={() => setUserFilter("MERCHANTS")}
                >
                  Store Owners ({summary.usersWithStore})
                </button>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${userFilter === "BUYERS" ? styles.chipBtnActive : ""}`}
                  onClick={() => setUserFilter("BUYERS")}
                >
                  Shoppers ({summary.pureBuyers})
                </button>
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-icons-round ${styles.emptyIcon}`}>person_search</span>
                <strong>No matching users found</strong>
                <span>Try clearing your search query or switching user filters.</span>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Account Role</th>
                      <th>Activity</th>
                      <th>Registered</th>
                      <th>User ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any) => {
                      const initial = (u.displayName || u.email || "U")[0].toUpperCase();
                      return (
                        <tr key={u.uid}>
                          <td>
                            <div className={styles.userCell}>
                              {u.photoURL ? (
                                <img src={u.photoURL} alt={u.displayName} className={styles.avatar} />
                              ) : (
                                <div className={styles.avatar}>{initial}</div>
                              )}
                              <div className={styles.userCellInfo}>
                                <span className={styles.userName}>{u.displayName}</span>
                                <span className={styles.userEmail}>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {u.has_store ? (
                              <span className={`${styles.badge} ${styles.badgeStore}`}>
                                <span className="material-icons-round" style={{ fontSize: "13px" }}>store</span>
                                Store Owner
                              </span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeBuyer}`}>
                                <span className="material-icons-round" style={{ fontSize: "13px" }}>shopping_bag</span>
                                Shopper
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                              🛒 {u.cartCount} in Cart • ❤️ {u.wishlistCount} Saved
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px" }}>{timeAgo(u.createdAt)}</span>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                              {u.uid.slice(0, 10)}...
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.tableActionBtn}
                              onClick={() => copyToClipboard(u.uid, "UID")}
                              title="Copy UID"
                            >
                              <span className="material-icons-round" style={{ fontSize: "14px" }}>content_copy</span>
                              <span>Copy ID</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: STORES INSPECTOR ── */}
        {activeTab === "stores" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#34d399" }}>storefront</span>
                  <span>Stores &amp; Merchants Directory ({filteredStores.length} of {summary.totalStores})</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  View all stores, check verification badges, plans, product counts, and manage store status.
                </p>
              </div>

              <Link href="/account/create-store" className={styles.tableActionBtn} target="_blank">
                <span className="material-icons-round" style={{ fontSize: "15px" }}>add</span>
                <span>Open Store Creator</span>
              </Link>
            </div>

            {/* Filter & Search Bar */}
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search store by name, slug, category, or owner email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterChips}>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${storeFilter === "ALL" ? styles.chipBtnActive : ""}`}
                  onClick={() => setStoreFilter("ALL")}
                >
                  All Stores ({summary.totalStores})
                </button>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${storeFilter === "VERIFIED" ? styles.chipBtnActive : ""}`}
                  onClick={() => setStoreFilter("VERIFIED")}
                >
                  Verified ({summary.verifiedStores})
                </button>
                <button
                  type="button"
                  className={`${styles.chipBtn} ${storeFilter === "PREMIUM" ? styles.chipBtnActive : ""}`}
                  onClick={() => setStoreFilter("PREMIUM")}
                >
                  Premium ({summary.premiumStores})
                </button>
              </div>
            </div>

            {filteredStores.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-icons-round ${styles.emptyIcon}`}>store</span>
                <strong>No matching stores found</strong>
                <span>Try searching with a different term.</span>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Store Brand</th>
                      <th>Category &amp; Location</th>
                      <th>Merchant / Contact</th>
                      <th>Products</th>
                      <th>Status &amp; Plan</th>
                      <th>Quick Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((s: any) => {
                      const initial = (s.name || "S")[0].toUpperCase();
                      const isLoadingAction = actionLoadingId === s.id;

                      return (
                        <tr key={s.id}>
                          <td>
                            <div className={styles.userCell}>
                              {s.logo ? (
                                <img src={s.logo} alt={s.name} className={styles.avatar} />
                              ) : (
                                <div className={styles.avatar} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                                  {initial}
                                </div>
                              )}
                              <div className={styles.userCellInfo}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span className={styles.userName}>{s.name}</span>
                                  {s.isVerified && (
                                    <span className="material-icons-round" style={{ fontSize: "14px", color: "#10b981" }} title="Verified">
                                      verified
                                    </span>
                                  )}
                                </div>
                                <span className={styles.userEmail}>/{s.slug}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{s.category}</span>
                              <span style={{ fontSize: "11.5px", color: "#64748b" }}>📍 {s.location}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontSize: "12.5px", color: "#cbd5e1" }}>{s.ownerEmail || s.phone || "No direct email"}</span>
                              {s.whatsapp && (
                                <span style={{ fontSize: "11px", color: "#10b981" }}>💬 WA: {s.whatsapp}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: "#ffffff" }}>
                              {s.productCount} items
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {s.isVerified ? (
                                <span className={`${styles.badge} ${styles.badgeVerified}`}>Verified</span>
                              ) : (
                                <span className={`${styles.badge} ${styles.badgeUnverified}`}>Unverified</span>
                              )}
                              {s.isPremium ? (
                                <span className={`${styles.badge} ${styles.badgePremium}`}>Premium Plan</span>
                              ) : (
                                <span className={`${styles.badge} ${styles.badgeStarter}`}>Starter Plan</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <Link
                                href={`/${s.slug}`}
                                target="_blank"
                                className={styles.tableActionBtn}
                                title="Open storefront"
                              >
                                <span className="material-icons-round" style={{ fontSize: "14px" }}>launch</span>
                                <span>Visit</span>
                              </Link>

                              <button
                                type="button"
                                className={styles.tableActionBtn}
                                disabled={isLoadingAction}
                                onClick={() =>
                                  handleAction(
                                    "TOGGLE_STORE_VERIFIED",
                                    { storeId: s.id, isVerified: !s.isVerified },
                                    s.id
                                  )
                                }
                                title={s.isVerified ? "Revoke Verification" : "Grant Verified Badge"}
                              >
                                <span className="material-icons-round" style={{ fontSize: "14px" }}>
                                  {s.isVerified ? "remove_circle_outline" : "verified"}
                                </span>
                                <span>{s.isVerified ? "Unverify" : "Verify"}</span>
                              </button>

                              <button
                                type="button"
                                className={styles.tableActionBtn}
                                disabled={isLoadingAction}
                                onClick={() =>
                                  handleAction(
                                    "TOGGLE_STORE_PREMIUM",
                                    { storeId: s.id, isPremium: !s.isPremium },
                                    s.id
                                  )
                                }
                                title={s.isPremium ? "Downgrade to Starter" : "Upgrade to Premium"}
                              >
                                <span className="material-icons-round" style={{ fontSize: "14px" }}>
                                  {s.isPremium ? "arrow_downward" : "workspace_premium"}
                                </span>
                                <span>{s.isPremium ? "Starter" : "Premium"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: ORDERS & TRANSACTIONS ── */}
        {activeTab === "orders" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#fbbf24" }}>receipt_long</span>
                  <span>Platform Orders &amp; Transactions ({filteredOrders.length} of {summary.totalOrders})</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  Monitor customer purchases, delivery milestones, payment confirmations, and total GMV volume.
                </p>
              </div>

              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>
                Total Platform GMV: {currency.format(summary.totalGMV)}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by order #, tracking #, customer, or store..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterChips}>
                {["ALL", "PROCESSING", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`${styles.chipBtn} ${orderFilter === st ? styles.chipBtnActive : ""}`}
                    onClick={() => setOrderFilter(st)}
                  >
                    {st === "ALL" ? `All Orders (${summary.totalOrders})` : `${st} (${(data?.summary?.ordersByStatus as any)?.[st] || 0})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-icons-round ${styles.emptyIcon}`}>receipt</span>
                <strong>No matching orders found</strong>
                <span>Try clearing the status filter or search box.</span>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Order &amp; Tracking</th>
                      <th>Customer</th>
                      <th>Store</th>
                      <th>Items &amp; Amount</th>
                      <th>Payment &amp; Fulfillment</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o: any) => {
                      const isLoadingAction = actionLoadingId === o.id;

                      let statusBg = "rgba(245, 158, 11, 0.15)";
                      let statusColor = "#fbbf24";
                      if (o.status === "DELIVERED") {
                        statusBg = "rgba(16, 185, 129, 0.15)";
                        statusColor = "#34d399";
                      } else if (o.status === "IN_TRANSIT") {
                        statusBg = "rgba(59, 130, 246, 0.15)";
                        statusColor = "#60a5fa";
                      } else if (o.status === "CANCELLED") {
                        statusBg = "rgba(239, 68, 68, 0.15)";
                        statusColor = "#f87171";
                      }

                      return (
                        <tr key={o.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontWeight: 800, color: "#ffffff" }}>
                                #{o.orderNumber}
                              </span>
                              <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                                {o.trackingNumber}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontWeight: 700, color: "#cbd5e1" }}>{o.customerName}</span>
                              <span style={{ fontSize: "11.5px", color: "#64748b" }}>{o.customerEmail || o.customerPhone}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: "#a5b4fc", fontWeight: 600 }}>{o.storeName}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <span style={{ fontWeight: 800, color: "#ffffff" }}>{currency.format(o.total)}</span>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{o.itemCount} items</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span className={styles.badge} style={{ background: statusBg, color: statusColor }}>
                                {o.status}
                              </span>
                              <span style={{ fontSize: "11px", color: o.paymentStatus === "PAID" ? "#34d399" : "#fbbf24" }}>
                                {o.paymentStatus === "PAID" ? "● Paid" : "○ Pending Verification"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{timeAgo(o.createdAt)}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <Link
                                href={`/track?tracking=${encodeURIComponent(o.trackingNumber || o.orderNumber)}`}
                                target="_blank"
                                className={styles.tableActionBtn}
                                title="Open Live Order Tracker"
                              >
                                <span className="material-icons-round" style={{ fontSize: "14px" }}>gps_fixed</span>
                                <span>Track</span>
                              </Link>

                              {o.status === "PROCESSING" && (
                                <button
                                  type="button"
                                  className={styles.tableActionBtn}
                                  disabled={isLoadingAction}
                                  onClick={() =>
                                    handleAction(
                                      "UPDATE_ORDER_STATUS",
                                      { orderId: o.id, status: "IN_TRANSIT" },
                                      o.id
                                    )
                                  }
                                >
                                  <span>Dispatch</span>
                                </button>
                              )}

                              {o.status === "IN_TRANSIT" && (
                                <button
                                  type="button"
                                  className={styles.tableActionBtn}
                                  disabled={isLoadingAction}
                                  onClick={() =>
                                    handleAction(
                                      "UPDATE_ORDER_STATUS",
                                      { orderId: o.id, status: "DELIVERED" },
                                      o.id
                                    )
                                  }
                                >
                                  <span>Delivered</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: CHAT INQUIRIES ── */}
        {activeTab === "conversations" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#f472b6" }}>forum</span>
                  <span>Buyer-to-Seller Conversations ({filteredConvs.length})</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  Inspect active customer inquiry threads and merchant responsiveness across the marketplace.
                </p>
              </div>
            </div>

            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <span className={`material-icons-round ${styles.searchIcon}`}>search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search inquiries by buyer, store, or message text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredConvs.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-icons-round ${styles.emptyIcon}`}>chat_bubble_outline</span>
                <strong>No matching chat inquiries</strong>
                <span>Customer messages between buyers and stores will appear here.</span>
              </div>
            ) : (
              <div className={styles.tableResponsive}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Store Target</th>
                      <th>Product Attached</th>
                      <th>Last Message Snippet</th>
                      <th>Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConvs.map((c: any) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 700, color: "#ffffff" }}>{c.buyerName}</span>
                            <span style={{ fontSize: "11.5px", color: "#64748b" }}>{c.buyerEmail}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>{c.storeName}</span>
                        </td>
                        <td>
                          {c.productName ? (
                            <span style={{ fontSize: "12px", color: "#a5b4fc" }}>
                              🛍️ {c.productName}
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#64748b" }}>General Inquiry</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: "12.5px", color: "#cbd5e1" }}>
                            &ldquo;{c.lastMessage}&rdquo;
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                            {timeAgo(c.lastMessageTimestamp)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: SYSTEM & SERVER HEALTH ── */}
        {activeTab === "system" && (
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleGroup}>
                <h2 className={styles.panelTitle}>
                  <span className="material-icons-round" style={{ color: "#818cf8" }}>memory</span>
                  <span>Sellora Infrastructure &amp; Backend Health</span>
                </h2>
                <p className={styles.panelSubtitle}>
                  Real-time status of Cloud Firestore, Gmail SMTP email notification dispatch, and server runtime.
                </p>
              </div>

              <button
                type="button"
                className={styles.tableActionBtn}
                onClick={handleTestEmail}
                disabled={emailSending}
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  {emailSending ? "hourglass_empty" : "send"}
                </span>
                <span>{emailSending ? "Sending Test..." : "Send Test Email to Admin"}</span>
              </button>
            </div>

            <div className={styles.healthGrid}>
              <div className={styles.healthCard}>
                <div className={styles.healthCardTop}>
                  <span className={styles.healthCardTitle}>
                    <span className="material-icons-round" style={{ color: "#34d399" }}>storage</span>
                    Firebase Firestore
                  </span>
                  <span className={`${styles.badge} ${styles.badgeVerified}`}>ONLINE</span>
                </div>
                <div className={styles.healthValue}>
                  Project: {data?.systemHealth?.firebaseStatus || "Connected"} (sellora-fe391)
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Live document read/write enabled for users, stores, orders, and chats.
                </span>
              </div>

              <div className={styles.healthCard}>
                <div className={styles.healthCardTop}>
                  <span className={styles.healthCardTitle}>
                    <span className="material-icons-round" style={{ color: "#60a5fa" }}>email</span>
                    Gmail SMTP Engine
                  </span>
                  <span className={`${styles.badge} ${styles.badgeVerified}`}>
                    {data?.systemHealth?.emailEngineConfigured ? "CONFIGURED" : "PENDING"}
                  </span>
                </div>
                <div className={styles.healthValue}>
                  User: {data?.systemHealth?.adminEmail || "joshuadivine985@gmail.com"}
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Automated customer receipts, merchant order alerts &amp; welcome emails.
                </span>
              </div>

              <div className={styles.healthCard}>
                <div className={styles.healthCardTop}>
                  <span className={styles.healthCardTitle}>
                    <span className="material-icons-round" style={{ color: "#c084fc" }}>dns</span>
                    Runtime Environment
                  </span>
                  <span className={`${styles.badge} ${styles.badgeStarter}`}>NEXT.JS 16</span>
                </div>
                <div className={styles.healthValue}>
                  Mode: {data?.systemHealth?.environment || "production"} • Turbopack
                </div>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Server Timestamp: {data?.systemHealth?.serverTimestamp ? new Date(data.systemHealth.serverTimestamp).toLocaleString() : "Live"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#1e1b4b",
            color: "#ffffff",
            border: "1px solid #4f46e5",
            borderRadius: "12px",
            padding: "12px 20px",
            fontSize: "13px",
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span className="material-icons-round" style={{ fontSize: "18px", color: "#34d399" }}>
            check_circle
          </span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
