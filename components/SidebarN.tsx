"use client";

import { useState, useEffect } from "react";
import styles from "@/app/home.module.css";
import sideStyles from "@/components/sidebar.module.css";
import SideButton from "@/components/SideButton";
import buyerNav from "@/config/BuyerNav";
import type { User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import storesData from "@/data/stores.json";
import { getStoreRelativePath } from "@/lib/storeUrl";
import { useChat } from "@/context/ChatContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onCreateStore?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  hasStore?: boolean;
  manageStore?: () => void;
  isAuthor?: boolean;
  product?: {
    id: string;
    name: string;
    author?: string;
    category?: string;
    price?: number;
    image?: string;
  } | null;
}

const MERCHANT_PATHS = [
  "/account/manage-store",
  "/account/create-store",
];

const merchantNav = [
  { label: "Dashboard", tab: null, icon: "dashboard" },
  { label: "Customer Orders", tab: "orders", icon: "receipt_long" },
  { label: "Customer Messages", tab: "messages", icon: "forum" },
  { label: "Analytics", tab: "analytics", icon: "bar_chart" },
  { label: "Products", tab: "products", icon: "inventory_2" },
  { label: "Promotions", tab: "promotions", icon: "local_offer" },
  { label: "Refer & Earn (₦1,000)", tab: "referrals", icon: "card_giftcard" },
  { label: "Store Settings", tab: "settings", icon: "settings" },
];

export default function Sidebar({
  isOpen,
  onClose,
  user,
  onSignOut,
  onSignIn,
  hasStore,
  onCreateStore,
  manageStore,
  isAuthor = false,
  product = null,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useChat();

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
    let isMounted = true;
    const sync = async () => {
      if (!user) {
        if (isMounted) setFavCount(0);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/followed-stores", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && Array.isArray(json.followedIds)) {
            setFavCount(json.followedIds.length);
            return;
          }
        }
      } catch {
        // ignore
      }
    };

    void sync();
    window.addEventListener("sellora_favorites_updated", sync);
    window.addEventListener("sellora_store_follow_changed", sync);
    return () => {
      isMounted = false;
      window.removeEventListener("sellora_favorites_updated", sync);
      window.removeEventListener("sellora_store_follow_changed", sync);
    };
  }, [user]);

  const visibleBuyerNav = buyerNav.filter((item) => user || !item.requiresAuth);

  const getBadge = (key?: "activeOrders" | "favoriteStores" | "unreadMessages") => {
    if (key === "favoriteStores") return favCount > 0 ? String(favCount) : undefined;
    if (key === "unreadMessages") return unreadCount > 0 ? String(unreadCount) : undefined;
    return undefined;
  };

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleManageStore = () => {
    onClose();
    if (manageStore) {
      manageStore();
    } else {
      router.push("/account/manage-store");
    }
  };

  const handleCreateStore = () => {
    onClose();
    if (onCreateStore) {
      onCreateStore();
    } else {
      router.push("/account/create-store");
    }
  };

  const scrollToSection = (id: string) => {
    onClose();
    if (typeof document !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const isProductPage = pathname.startsWith("/products/");

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
                    n={item.tab === "messages" && unreadCount > 0 ? String(unreadCount) : undefined}
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

            {user?.email?.toLowerCase() === "joshuadivine985@gmail.com" && (
              <button
                className={sideStyles.switchModeBtn}
                style={{ background: "#111827", color: "#a5b4fc", borderColor: "#3730a3" }}
                onClick={() => navigate("/developer")}
              >
                <span className="material-icons-round" style={{ fontSize: "18px", color: "#818cf8" }}>terminal</span>
                Developer Console
              </button>
            )}

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
          /* ── BUYER & PRODUCT DETAIL SIDEBAR ── */
          <>
            <div className={styles.sidebarTitle}>
              <span>{user ? user.displayName || "My account" : "Navigation"}</span>
              <button onClick={onClose} aria-label="Close menu">
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* ── AUTHOR / SELLER HUB IN SIDEBAR ── */}
            {isAuthor && product ? (
              <div className={sideStyles.authorHubCard}>
                <div className={sideStyles.authorHubBadge}>
                  <span className="material-icons-round" style={{ fontSize: "15px", color: "#b45309" }}>
                    workspace_premium
                  </span>
                  Your Product Listing
                </div>
                <div className={sideStyles.authorHubTitle}>Owner Controls</div>
                <div className={sideStyles.authorHubDesc}>
                  You are viewing this listing as customers see it.
                </div>
                <div className={sideStyles.authorActionsList}>
                  <button
                    className={sideStyles.authorActionBtn}
                    onClick={() => navigate("/account/manage-store?tab=products")}
                  >
                    <span className="material-icons-round">edit_note</span>
                    Manage in Merchant Hub
                  </button>
                  <button
                    className={sideStyles.authorActionBtn}
                    onClick={() => navigate("/account/manage-store?tab=orders")}
                  >
                    <span className="material-icons-round">receipt_long</span>
                    Customer Orders
                  </button>
                  <button
                    className={sideStyles.authorActionBtn}
                    onClick={handleManageStore}
                  >
                    <span className="material-icons-round">dashboard</span>
                    Store Dashboard
                  </button>
                </div>
              </div>
            ) : (
              /* Create Store or Manage Store for general users */
              user && (
                hasStore ? (
                  <button className={styles.createStore} onClick={handleManageStore}>
                    Manage store
                    <span className="material-icons-round">chevron_right</span>
                  </button>
                ) : (
                  <button className={styles.createStore} onClick={handleCreateStore}>
                    <span className="material-icons-round">add</span>
                    Create store
                  </button>
                )
              )
            )}

            {/* ── PRODUCT STORE CONTEXT (for buyers viewing a product) ── */}
            {product && !isAuthor && (
              <div className={sideStyles.productContextCard}>
                <div className={sideStyles.productContextTitle}>
                  <span className="material-icons-round" style={{ fontSize: "14px", color: "#2b6dff" }}>
                    storefront
                  </span>
                  Sold by Store
                </div>
                <div className={sideStyles.productStoreHeader}>
                  <div className={sideStyles.productStoreAvatar}>
                    {(product.author || "S")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className={sideStyles.productStoreName}>
                      {product.author || "Sellora Merchant"}
                    </div>
                    {product.category && (
                      <div className={sideStyles.productStoreCat}>
                        {product.category}
                      </div>
                    )}
                  </div>
                </div>
                <div className={sideStyles.productContextActions}>
                  {product.author && (
                    <button
                      type="button"
                      className={sideStyles.productContextBtn}
                      onClick={() => navigate(getStoreRelativePath(product.author || ""))}
                    >
                      <span className="material-icons-round">store</span>
                      Browse Store Items
                    </button>
                  )}
                  {product.category && (
                    <button
                      type="button"
                      className={sideStyles.productContextBtn}
                      onClick={() => navigate(`/?category=${encodeURIComponent(product.category || "")}`)}
                    >
                      <span className="material-icons-round">category</span>
                      More in {product.category}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── ON-PAGE JUMP SECTIONS (When viewing a product) ── */}
            {isProductPage && (
              <div className={sideStyles.pageJumpList}>
                <div className={sideStyles.pageJumpTitle}>On This Page</div>
                <button
                  type="button"
                  className={sideStyles.pageJumpBtn}
                  onClick={() => scrollToSection("product-overview")}
                >
                  <span className="material-icons-round">info</span>
                  Overview
                </button>
                <button
                  type="button"
                  className={sideStyles.pageJumpBtn}
                  onClick={() => scrollToSection("product-specs")}
                >
                  <span className="material-icons-round">tune</span>
                  Specifications
                </button>
                <button
                  type="button"
                  className={sideStyles.pageJumpBtn}
                  onClick={() => scrollToSection("product-seller")}
                >
                  <span className="material-icons-round">storefront</span>
                  About Seller
                </button>
                <button
                  type="button"
                  className={sideStyles.pageJumpBtn}
                  onClick={() => scrollToSection("product-related")}
                >
                  <span className="material-icons-round">auto_awesome_motion</span>
                  Related Items
                </button>
              </div>
            )}

            {/* Main Buyer Navigation */}
            <nav className={styles.sideNav}>
              {visibleBuyerNav.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/" || isProductPage
                  : pathname.startsWith(item.href);
                return (
                  <SideButton
                    key={item.href}
                    label={item.href === "/" && isProductPage ? "Browse catalog" : item.label}
                    icon={item.icon}
                    n={getBadge(item.badgeKey)}
                    onClick={() => navigate(item.href)}
                    active={isActive}
                  />
                );
              })}
              {user?.email?.toLowerCase() === "joshuadivine985@gmail.com" && (
                <SideButton
                  label="Developer Console"
                  icon="terminal"
                  onClick={() => navigate("/developer")}
                  active={pathname === "/developer"}
                />
              )}
              {user ? (
                <SideButton label="Log out" icon="logout" onClick={() => { onClose(); onSignOut(); }} />
              ) : (
                <SideButton label="Log in" icon="login" onClick={() => { onClose(); onSignIn(); }} />
              )}
            </nav>

            {/* Bottom Card */}
            {isAuthor || hasStore ? (
              <div className={sideStyles.merchantCard} style={{ marginTop: "14px" }}>
                <span className="material-icons-round" style={{ color: "#7c3aed", fontSize: "20px" }}>
                  auto_awesome
                </span>
                <strong>Your Store is Active</strong>
                <p>Manage your inventory, track customer orders, and grow your sales.</p>
                <button
                  className={sideStyles.switchModeBtn}
                  style={{ marginTop: "10px", marginBottom: 0, justifyContent: "center" }}
                  onClick={handleManageStore}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>storefront</span>
                  Merchant Hub
                </button>
              </div>
            ) : (
              <div className={styles.upgradeCard}>
                <span className="material-icons-round">auto_awesome</span>
                <strong>Sell on Sellora</strong>
                <p>Reach millions of shoppers and open your own verified storefront.</p>
                <button onClick={handleCreateStore}>
                  Start selling
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
