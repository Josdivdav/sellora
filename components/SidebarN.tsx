"use client";

import { useState, useEffect } from "react";
import styles from "@/app/home.module.css";
import sideStyles from "@/components/sidebar.module.css";
import SideButton from "@/components/SideButton";
import buyerNav from "@/config/BuyerNav";
import type { User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import storesData from "@/data/stores.json";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onCreateStore?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  hasStore?: boolean;
  manageStore?: () => void;
}

const MERCHANT_PATHS = [
  "/account/manage-store",
  "/account/create-store",
];

const merchantNav = [
  { label: "Dashboard", tab: null, icon: "dashboard" },
  { label: "Customer Orders", tab: "orders", icon: "receipt_long" },
  { label: "Analytics", tab: "analytics", icon: "bar_chart" },
  { label: "Products", tab: "products", icon: "inventory_2" },
  { label: "Promotions", tab: "promotions", icon: "local_offer" },
  { label: "Store Settings", tab: "settings", icon: "settings" },
];

export default function Sidebar({
  isOpen,
  onClose,
  user,
  onSignOut,
  onSignIn,
  hasStore,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Read ?tab= after mount to avoid useSearchParams Suspense requirement
  const [activeTab, setActiveTab] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveTab(params.get("tab"));
  }, [pathname]);

  // Merchant mode: true when on a merchant page
  const isMerchantMode = MERCHANT_PATHS.some((p) => pathname.startsWith(p));


  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem("sellora_favorite_stores");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) { setFavCount(parsed.length); return; }
        }
      } catch { /* ignore */ }
      setFavCount(storesData.filter((s) => s.isFavorite).length);
    };
    sync();
    window.addEventListener("sellora_favorites_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sellora_favorites_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visibleBuyerNav = buyerNav.filter((item) => user || !item.requiresAuth);

  const getBadge = (key?: "activeOrders" | "favoriteStores") => {
    if (key === "favoriteStores") return favCount > 0 ? String(favCount) : undefined;
    return undefined;
  };

  const navigate = (href: string) => { onClose(); router.push(href); };

  return (
    <>
      <button
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
        onClick={onClose}
        aria-label="Close menu"
      />

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Navigation menu"
      >
        {/* ── MERCHANT SIDEBAR ── */}
        {isMerchantMode ? (
          <>
            {/* Header */}
            <div className={sideStyles.merchantHeader}>
              <div className={sideStyles.merchantHeaderLeft}>
                <span className={`material-icons-round ${sideStyles.merchantIcon}`}>storefront</span>
                <div>
                  <span className={sideStyles.merchantLabel}>Merchant Hub</span>
                  <span className={sideStyles.merchantSub}>Store Management</span>
                </div>
              </div>
              <button onClick={onClose} className={sideStyles.closeBtn} aria-label="Close">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* Merchant nav */}
            <nav className={`${styles.sideNav} ${sideStyles.merchantNav}`}>
              {merchantNav.map((item) => {
                const isActive = item.tab === null
                  ? activeTab === null
                  : activeTab === item.tab;
                const href = item.tab
                  ? `/account/manage-store?tab=${item.tab}`
                  : "/account/manage-store";
                return (
                  <SideButton
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => navigate(href)}
                    active={isActive}
                  />
                );
              })}
            </nav>

            {/* Divider */}
            <div className={sideStyles.divider} />

            {/* Switch back to buyer */}
            <button className={sideStyles.switchModeBtn} onClick={() => navigate("/")}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>arrow_back</span>
              Back to Shopping
            </button>

            {/* Sign out */}
            <div className={`${styles.sideNav} ${sideStyles.merchantBottom}`}>
              {user ? (
                <SideButton label="Sign Out" icon="logout" onClick={() => { onClose(); onSignOut(); }} />
              ) : (
                <SideButton label="Sign In" icon="login" onClick={() => { onClose(); onSignIn(); }} />
              )}
            </div>

            {/* Store quick-stats card */}
            <div className={sideStyles.merchantCard}>
              <span className="material-icons-round" style={{ color: "#7c3aed", fontSize: "20px" }}>auto_awesome</span>
              <strong>Your Store is Live</strong>
              <p>Manage products, track orders, and grow your business from here.</p>
            </div>
          </>
        ) : (
          /* ── BUYER SIDEBAR ── */
          <>
            <div className={styles.sidebarTitle}>
              <span>{user ? user.displayName || "My account" : "Navigation"}</span>
              <button onClick={onClose} aria-label="Close menu">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {user && (
              hasStore ? (
                <button className={styles.createStore} onClick={() => navigate("/account/manage-store")}>
                  Manage store
                  <span className="material-icons-round">chevron_right</span>
                </button>
              ) : (
                <button className={styles.createStore} onClick={() => navigate("/account/create-store")}>
                  <span className="material-icons-round">add</span>
                  Create store
                </button>
              )
            )}

            <nav className={styles.sideNav}>
              {visibleBuyerNav.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <SideButton
                    key={item.href}
                    label={item.label}
                    icon={item.icon}
                    n={getBadge(item.badgeKey)}
                    onClick={() => navigate(item.href)}
                    active={isActive}
                  />
                );
              })}
              {user ? (
                <SideButton label="Log out" icon="logout" onClick={() => { onClose(); onSignOut(); }} />
              ) : (
                <SideButton label="Log in" icon="login" onClick={() => { onClose(); onSignIn(); }} />
              )}
            </nav>

            <div className={styles.upgradeCard}>
              <span className="material-icons-round">auto_awesome</span>
              <strong>Sell on Sellora</strong>
              <p>Reach millions of shoppers and open your own verified storefront.</p>
              <button onClick={() => navigate(hasStore ? "/account/manage-store" : "/account/create-store")}>
                {hasStore ? "Manage store" : "Start selling"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
