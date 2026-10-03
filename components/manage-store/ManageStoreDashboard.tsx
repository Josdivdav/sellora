"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import styles from "./manage-store.module.css";
import ProductFormModal from "./ProductFormModal";
import DeleteProductModal from "./DeleteProductModal";
import EditStoreModal from "./EditStoreModal";
import UpgradeToPremiumModal from "./UpgradeToPremiumModal";
import ProductDetailsModal from "./ProductDetailsModal";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import type { User } from "firebase/auth";
import { getStoreRelativePath, getStoreFullUrl } from "@/lib/storeUrl";

const MerchantOrdersTab = lazy(() => import("./tabs/MerchantOrdersTab"));
const MerchantAnalyticsTab = lazy(() => import("./tabs/MerchantAnalyticsTab"));
const MerchantPromotionsTab = lazy(() => import("./tabs/MerchantPromotionsTab"));
const MerchantReferralsTab = lazy(() => import("./tabs/MerchantReferralsTab"));
const MerchantSettingsTab = lazy(() => import("./tabs/MerchantSettingsTab"));

interface ManageStoreDashboardProps {
  user: User | null;
  isAuthLoading: boolean;
  activeTab?: string;
  onShowToast: (msg: string) => void;
}

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function ManageStoreLoadingState() {
  return (
    <main className={styles.loadingState} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your store dashboard</span>
      <div className={`${styles.loadingBar} ${styles.loadingBreadcrumb}`} />
      <section className={styles.loadingHero}>
        <div className={`${styles.loadingBar} ${styles.loadingBanner}`} />
        <div className={styles.loadingStoreDetails}>
          <div className={`${styles.loadingBar} ${styles.loadingLogo}`} />
          <div className={styles.loadingTitleGroup}>
            <div className={`${styles.loadingBar} ${styles.loadingTitle}`} />
            <div className={`${styles.loadingBar} ${styles.loadingSubtitle}`} />
          </div>
        </div>
      </section>
      <div className={styles.loadingStats}>
        {Array.from({ length: 5 }, (_, index) => (
          <div className={styles.loadingStatCard} key={index}>
            <div className={`${styles.loadingBar} ${styles.loadingStatIcon}`} />
            <div>
              <div className={`${styles.loadingBar} ${styles.loadingStatValue}`} />
              <div className={`${styles.loadingBar} ${styles.loadingStatLabel}`} />
            </div>
          </div>
        ))}
      </div>
      <section className={styles.loadingCatalog}>
        <div className={styles.loadingCatalogHeader}>
          <div className={`${styles.loadingBar} ${styles.loadingCatalogTitle}`} />
          <div className={`${styles.loadingBar} ${styles.loadingButton}`} />
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.loadingProductRow} key={index}>
            <div className={`${styles.loadingBar} ${styles.loadingProduct}`} />
            <div className={`${styles.loadingBar} ${styles.loadingCell}`} />
            <div className={`${styles.loadingBar} ${styles.loadingCell}`} />
            <div className={`${styles.loadingBar} ${styles.loadingCell}`} />
          </div>
        ))}
      </section>
    </main>
  );
}

export default function ManageStoreDashboard({
  user,
  isAuthLoading,
  activeTab = "dashboard",
  onShowToast,
}: ManageStoreDashboardProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isEditStoreModalOpen, setIsEditStoreModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Load store, products, and customer orders from backend database
  const loadData = useCallback(async () => {
    try {
      const token = await user?.getIdToken(true).catch(() => user?.getIdToken());
      if (!token) {
        setIsLoaded(true);
        return;
      }

      // Fetch store, products, and orders concurrently from Firestore
      const [storeRes, prodsRes, ordersRes] = await Promise.all([
        fetch("/api/user/store", {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/user/store/products", {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/user/store/orders", {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (storeRes.status === 404) {
        setStore(null);
        setProducts([]);
        setOrders([]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sellora_store_status_changed"));
        }
        return;
      }

      if (storeRes.status === 401 || prodsRes.status === 401) {
        console.warn("Session expired or unauthorized in manage-store");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sellora_session_expired"));
        }
        setStore(null);
        setProducts([]);
        setOrders([]);
        return;
      }

      if (!storeRes.ok) {
        const errData = await storeRes.json().catch(() => ({}));
        console.error("Store fetch failed:", storeRes.status, errData);
        onShowToast(errData?.error || "Could not load store data");
        return;
      }

      const storeJson = await storeRes.json();
      const storeData: Store = storeJson.data;
      setStore(storeData);

      let fetchedProducts: Product[] = [];
      if (prodsRes.ok) {
        const prodsJson = await prodsRes.json();
        fetchedProducts = prodsJson.products || [];
      }
      setProducts(fetchedProducts);

      let fetchedOrders: Order[] = [];
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        fetchedOrders = ordersJson.orders || [];
      }
      setOrders(fetchedOrders);


    } catch (error) {
      console.error("Error loading store data from backend:", error);
      onShowToast("Unable to load latest data from backend");
    } finally {
      setIsLoaded(true);
    }
  }, [user, onShowToast]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoaded(true);
      return;
    }
    void loadData();
  }, [user, isAuthLoading, loadData]);

  // Add or Edit Product Handler synced to backend
  const handleSaveProduct = async (savedProduct: Product) => {
    const token = await user?.getIdToken();
    if (!token) {
      onShowToast("Authentication required. Please sign in.");
      return;
    }

    if (editingProduct) {
      // Update existing product in backend
      const res = await fetch(`/api/user/store/products/${savedProduct.id}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savedProduct),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update product");
      }

      const updatedProd = result.product || savedProduct;
      const updated = products.map((p) =>
        p.id === savedProduct.id ? updatedProd : p
      );
      setProducts(updated);
      onShowToast(`Updated "${savedProduct.name}"`);
    } else {
      // Add new product to backend
      const res = await fetch("/api/user/store/products", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savedProduct),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to add product");
      }

      const newProd = result.product || savedProduct;
      const updated = [newProd, ...products];
      setProducts(updated);

      if (store) {
        const updatedStore = {
          ...store,
          productsCount: (store.productsCount ?? 0) + 1,
        };
        setStore(updatedStore);
      }
      onShowToast(`Added "${savedProduct.name}" to store catalog`);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Delete Product Handler synced to backend
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const token = await user?.getIdToken();
    if (!token) {
      onShowToast("Authentication required.");
      return;
    }

    setIsDeletingProduct(true);
    try {
      const res = await fetch(`/api/user/store/products/${deletingProduct.id}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to delete product");
      }

      const updated = products.filter((p) => p.id !== deletingProduct.id);
      setProducts(updated);

      if (store) {
        const updatedStore = {
          ...store,
          productsCount: Math.max(0, (store.productsCount ?? 1) - 1),
        };
        setStore(updatedStore);
      }
      onShowToast(`Deleted "${deletingProduct.name}"`);
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
    } catch (err: any) {
      onShowToast(err?.message || "Failed to delete product");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Edit Store Details Handler synced to backend
  const handleSaveStoreDetails = async (updatedStore: Store) => {
    const token = await user?.getIdToken();
    if (!token) {
      throw new Error("Authentication required.");
    }

    const res = await fetch("/api/user/store", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedStore),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to update store settings");
    }

    const finalStore = result.data || updatedStore;
    setStore(finalStore);

    try {
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    } catch {
      // ignore
    }

    // Also update author name in products if store name changed
    if (finalStore.name !== store?.name) {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          author: finalStore.name,
        }))
      );
    }

    setIsEditStoreModalOpen(false);
    onShowToast("Storefront details updated!");
  };

  // Copy Store Link
  const handleCopyStoreLink = () => {
    if (!store) return;
    const url = getStoreFullUrl(store);

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      onShowToast("Copied store link: " + url);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const stockNum = p.stock ?? 0;
      let matchesStatus = true;
      if (statusFilter === "IN_STOCK") matchesStatus = stockNum >= 10;
      if (statusFilter === "LOW_STOCK") matchesStatus = stockNum > 0 && stockNum < 10;
      if (statusFilter === "OUT_OF_STOCK") matchesStatus = stockNum <= 0;

      const matchesCat =
        categoryFilter === "ALL" || p.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalCount = products.length;
    const inStockCount = products.filter((p) => (p.stock ?? 0) > 0).length;
    const totalValuation = products.reduce(
      (acc, p) => acc + p.price * (p.stock ?? 1),
      0
    );
    return {
      totalCount,
      inStockCount,
      totalValuation,
    };
  }, [products]);

  // Available unique categories
  const categoriesList = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats);
  }, [products]);

  if (!isLoaded || isAuthLoading) {
    return <ManageStoreLoadingState />;
  }

  // If user is not logged in, prompt to log in
  if (!user) {
    return (
      <div className={styles.noStoreBox}>
        <div className={styles.noStoreIcon}>
          <span className="material-icons-round">lock</span>
        </div>
        <h2 className={styles.noStoreTitle}>Sign In to Manage Your Store</h2>
        <p className={styles.noStoreDesc}>
          Please sign in to your merchant account to manage your store settings, products catalog, and inventory.
        </p>
        <Link href="/login" className={styles.createStorePromptBtn}>
          <span className="material-icons-round">login</span>
          Sign In Now
        </Link>
      </div>
    );
  }

  // If no store exists yet, show prompt to create one
  if (!store) {
    return (
      <div className={styles.noStoreBox}>
        <div className={styles.noStoreIcon}>
          <span className="material-icons-round">storefront</span>
        </div>
        <h2 className={styles.noStoreTitle}>No Active Storefront Found</h2>
        <p className={styles.noStoreDesc}>
          You haven&apos;t created a Sellora storefront yet. Create your verified store in minutes to start listing and managing your products.
        </p>
        <Link href="/account/create-store" className={styles.createStorePromptBtn}>
          <span className="material-icons-round">add_circle</span>
          Create Your Storefront Now
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href="/account/favorites" className={styles.breadcrumbLink}>
          Merchant Hub
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Store Management</span>
      </nav>

      {/* Store Hero Card */}
      <section className={styles.storeHeroCard}>
        <div className={styles.heroBannerWrap}>
          <img
            src={store.banner}
            alt={`${store.name} banner`}
            className={styles.heroBannerImg}
          />
          {store.badge && <span className={styles.heroBadge}>{store.badge}</span>}

          <div className={styles.heroQuickActions}>
            <Link
              href="/account/manage-store?tab=referrals"
              className={styles.heroActionBtn}
              title="Refer other merchants and earn ₦1,000 per store"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                card_giftcard
              </span>
              Refer &amp; Earn (₦1,000)
            </Link>
            <button
              type="button"
              className={styles.heroActionBtn}
              onClick={handleCopyStoreLink}
              title="Copy shareable store link"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                share
              </span>
              Share Link
            </button>
            <Link
              href={getStoreRelativePath(store)}
              className={styles.heroActionBtn}
              title="View public storefront"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                storefront
              </span>
              Storefront View
            </Link>
          </div>
        </div>

        <div className={styles.storeMetaSection}>
          <div className={styles.storeIdentityRow}>
            <div className={styles.logoAndName}>
              <div className={styles.storeLogoWrap}>
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={`${store.name} logo`}
                    className={styles.storeLogoImg}
                  />
                ) : (
                  <span className={styles.storeLogoFallback}>
                    {store.name}
                  </span>
                )}
              </div>

              <div className={styles.nameBlock}>
                <h1 className={styles.storeName}>
                  {store.name}
                  {store.isVerified && (
                    <span
                      className={`material-icons-round ${styles.verifiedCheck}`}
                      title="Verified Merchant"
                    >
                      verified
                    </span>
                  )}
                </h1>
                <div className={styles.storeSlugLine}>
                  <span className={styles.slugTag}>{getStoreFullUrl(store).replace(/^https?:\/\//, "")}</span>
                  {Boolean(store.isPremium || store.plan === "premium") ? (
                    <span className={styles.premiumDomainBadge}>
                      <span className="material-icons-round" style={{ fontSize: "14px", color: "#059669" }}>
                        workspace_premium
                      </span>
                      PRO SUBDOMAIN ACTIVE
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.upgradeUrlBtn}
                      onClick={() => setIsUpgradeModalOpen(true)}
                      title="Upgrade to unique subdomain: storename.devico.online"
                    >
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        stars
                      </span>
                      Upgrade to {store.slug}.devico.online
                    </button>
                  )}
                  <span>•</span>
                  <span className={styles.categoryTag}>{store.category}</span>
                  <span>•</span>
                  <span className={styles.followerBadge}>
                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#7c3aed" }}>
                      groups
                    </span>
                    <strong>{(store.followersCount ?? 0).toLocaleString()}</strong> Followers
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.heroButtonRight}>
              {Boolean(store.isPremium || store.plan === "premium") ? (
                <div className={styles.proActiveHeroBadge}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#059669" }}>
                    verified
                  </span>
                  <span>PRO SUBDOMAIN ACTIVE</span>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.activatePremiumHeroBtn}
                  onClick={() => setIsUpgradeModalOpen(true)}
                  title="Activate your unique store subdomain (storename.devico.online)"
                >
                  <span className="material-icons-round" style={{ fontSize: "18px", color: "#f59e0b" }}>
                    workspace_premium
                  </span>
                  <span>Activate Premium (₦5,000)</span>
                </button>
              )}
              <button
                type="button"
                className={styles.editStoreBtn}
                onClick={() => setIsEditStoreModalOpen(true)}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  settings
                </span>
                Edit Store Settings
              </button>
            </div>
          </div>

          <div className={styles.storeBioRow}>
            <p className={styles.storeBio}>{store.description}</p>
            <div className={styles.storePills}>
              <span className={styles.storePillItem}>
                <span className="material-icons-round" style={{ fontSize: "16px", color: "#6b7280" }}>
                  location_on
                </span>
                {store.location}
              </span>
              <span className={styles.storePillItem}>
                <span
                  className="material-icons-round"
                  style={{ fontSize: "16px", color: "#059669" }}
                >
                  bolt
                </span>
                <span className={styles.deliveryGreen}>{store.deliverySpeed}</span>
              </span>
              <span className={styles.storePillItem}>
                <span
                  className="material-icons-round"
                  style={{ fontSize: "16px", color: "#7c3aed" }}
                >
                  people
                </span>
                <span style={{ fontWeight: 600, color: "#4c1d95" }}>
                  {(store.followersCount ?? 0).toLocaleString()} Store Followers
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MERCHANT HUB TAB NAVIGATION ── */}
      <nav className={styles.merchantTabsNav} aria-label="Merchant Navigation">
        <Link
          href="/account/manage-store"
          className={`${styles.merchantTabLink} ${(!activeTab || activeTab === "dashboard") ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>dashboard</span>
          Dashboard
        </Link>
        <Link
          href="/account/manage-store?tab=products"
          className={`${styles.merchantTabLink} ${activeTab === "products" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>inventory_2</span>
          Products ({products.length})
        </Link>
        <Link
          href="/account/manage-store?tab=orders"
          className={`${styles.merchantTabLink} ${activeTab === "orders" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>shopping_bag</span>
          Orders ({orders.length})
        </Link>
        <Link
          href="/account/manage-store?tab=analytics"
          className={`${styles.merchantTabLink} ${activeTab === "analytics" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>insights</span>
          Analytics
        </Link>
        <Link
          href="/account/manage-store?tab=promotions"
          className={`${styles.merchantTabLink} ${activeTab === "promotions" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>local_offer</span>
          Promotions
        </Link>
        <Link
          href="/account/manage-store?tab=referrals"
          className={`${styles.merchantTabLink} ${activeTab === "referrals" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px", color: activeTab === "referrals" ? "#ffffff" : "#10b981" }}>
            card_giftcard
          </span>
          Refer &amp; Earn (₦1,000)
        </Link>
        <Link
          href="/account/manage-store?tab=settings"
          className={`${styles.merchantTabLink} ${activeTab === "settings" ? styles.merchantTabLinkActive : ""}`}
        >
          <span className="material-icons-round" style={{ fontSize: "18px" }}>settings</span>
          Settings
        </Link>
        {!Boolean(store.isPremium || store.plan === "premium") ? (
          <button
            type="button"
            className={styles.merchantTabUpgradeBtn}
            onClick={() => setIsUpgradeModalOpen(true)}
            title="Unlock your unique standalone subdomain (storename.devico.online)"
          >
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#f59e0b" }}>workspace_premium</span>
            Upgrade to Pro Subdomain (₦5,000)
          </button>
        ) : (
          <span className={styles.merchantTabProActiveBadge}>
            <span className="material-icons-round" style={{ fontSize: "16px", color: "#059669" }}>verified</span>
            Pro Subdomain Active
          </span>
        )}
      </nav>

      {/* ── TAB CONTENT ── */}
      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading...</div>}>
        {activeTab === "orders" && (
          <MerchantOrdersTab
            store={store}
            orders={orders}
            onOrdersChange={setOrders}
            currency={currency}
            user={user}
            onShowToast={onShowToast}
          />
        )}
        {activeTab === "analytics" && (
          <MerchantAnalyticsTab
            store={store}
            products={products}
            orders={orders}
            currency={currency}
          />
        )}
        {activeTab === "promotions" && (
          <MerchantPromotionsTab store={store} user={user} onShowToast={onShowToast} />
        )}
        {activeTab === "referrals" && (
          <MerchantReferralsTab
            store={store}
            user={user}
            onShowToast={onShowToast}
            onStoreUpdated={(updated) => setStore(updated)}
          />
        )}
        {activeTab === "settings" && (
          <MerchantSettingsTab
            store={store}
            onSave={handleSaveStoreDetails}
            onShowToast={onShowToast}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
          />
        )}
      </Suspense>

      {/* Dashboard tab: stats + products catalog */}
      {(!activeTab || activeTab === "dashboard" || activeTab === "products") && (
        <>
          {/* Pro Subdomain Benefits Card / Active Banner — on dashboard overview */}
          {(!activeTab || activeTab === "dashboard") && (
            <>
              {!Boolean(store.isPremium || store.plan === "premium") ? (
                <div className={styles.premiumBannerCard}>
                  <div className={styles.premiumBannerTop}>
                    <div className={styles.premiumBannerBadge}>
                      <span className="material-icons-round" style={{ fontSize: "16px", color: "#f59e0b" }}>
                        stars
                      </span>
                      EXCLUSIVE STORE OWNER PERK
                    </div>
                    <span className={styles.premiumPricePill}>₦5,000 One-time Activation</span>
                  </div>

                  <div className={styles.premiumBannerMain}>
                    <div className={styles.premiumBannerContent}>
                      <h3 className={styles.premiumBannerHeading}>
                        Unlock Your Standalone Subdomain: <span className={styles.premiumHighlight}>{store.slug}.devico.online</span>
                      </h3>
                      <p className={styles.premiumBannerDesc}>
                        Upgrade from a standard shared link (<code className={styles.codeSnippet}>devico.online/{store.slug}</code>) to your own branded, professional storefront URL with instant self-activation.
                      </p>

                      {/* 4 Core Benefits Grid */}
                      <div className={styles.premiumPerksGrid}>
                        <div className={styles.premiumPerkItem}>
                          <div className={styles.premiumPerkIconWrap}>
                            <span className="material-icons-round">language</span>
                          </div>
                          <div>
                            <h4 className={styles.premiumPerkTitle}>Standalone Subdomain</h4>
                            <p className={styles.premiumPerkText}>
                              Your dedicated address <strong>{store.slug}.devico.online</strong> separates your brand from the shared directory path.
                            </p>
                          </div>
                        </div>

                        <div className={styles.premiumPerkItem}>
                          <div className={styles.premiumPerkIconWrap}>
                            <span className="material-icons-round">verified</span>
                          </div>
                          <div>
                            <h4 className={styles.premiumPerkTitle}>Verified Pro Merchant Badge</h4>
                            <p className={styles.premiumPerkText}>
                              Display verified credentials on your storefront and listings to inspire buyer confidence.
                            </p>
                          </div>
                        </div>

                        <div className={styles.premiumPerkItem}>
                          <div className={styles.premiumPerkIconWrap}>
                            <span className="material-icons-round">trending_up</span>
                          </div>
                          <div>
                            <h4 className={styles.premiumPerkTitle}>Higher Sales &amp; Trust</h4>
                            <p className={styles.premiumPerkText}>
                              Branded standalone URLs look established and trustworthy, leading to fewer abandoned checkouts.
                            </p>
                          </div>
                        </div>

                        <div className={styles.premiumPerkItem}>
                          <div className={styles.premiumPerkIconWrap}>
                            <span className="material-icons-round">savings</span>
                          </div>
                          <div>
                            <h4 className={styles.premiumPerkTitle}>Lifetime Access — No Subscriptions</h4>
                            <p className={styles.premiumPerkText}>
                              Single ₦5,000 direct bank transfer. No monthly fees, no hosting charges, 0% platform commission on orders.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.premiumBannerCtaWrap}>
                      <button
                        type="button"
                        className={styles.premiumBannerCtaBtn}
                        onClick={() => setIsUpgradeModalOpen(true)}
                      >
                        <span className="material-icons-round" style={{ fontSize: "20px" }}>workspace_premium</span>
                        Activate Pro Subdomain (₦5,000)
                      </button>
                      <Link
                        href="/account/manage-store?tab=referrals"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#cbd5e1",
                          fontSize: "12.5px",
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        <span className="material-icons-round" style={{ fontSize: "16px", color: "#f59e0b" }}>card_giftcard</span>
                        Or refer 3 merchants to get it 100% FREE →
                      </Link>
                      <span className={styles.premiumCtaHint}>
                        <span className="material-icons-round" style={{ fontSize: "14px", color: "#10b981" }}>bolt</span>
                        Instant activation via direct transfer &amp; WhatsApp
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.premiumActiveBanner}>
                  <div className={styles.premiumActiveLeft}>
                    <div className={styles.premiumActiveIconWrap}>
                      <span className="material-icons-round">verified</span>
                    </div>
                    <div>
                      <div className={styles.premiumActiveTitle}>
                        Pro Subdomain Plan Active
                      </div>
                      <div className={styles.premiumActiveSub}>
                        Your standalone store is live at{" "}
                        <a
                          href={getStoreFullUrl(store)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.premiumActiveLink}
                        >
                          {getStoreFullUrl(store)}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className={styles.premiumActiveActions}>
                    <button
                      type="button"
                      className={styles.premiumActiveBtn}
                      onClick={handleCopyStoreLink}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>share</span>
                      Copy Pro Link
                    </button>
                    <a
                      href={getStoreFullUrl(store)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.premiumActiveBtnOutline}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>open_in_new</span>
                      Visit Storefront
                    </a>
                  </div>
                </div>
              )}

              {/* Stats Grid — only on dashboard */}
              <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconIndigo}`}>
                  <span className="material-icons-round">inventory_2</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{stats.totalCount}</span>
                  <span className={styles.statTitle}>Total Products</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconEmerald}`}>
                  <span className="material-icons-round">check_circle</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{stats.inStockCount}</span>
                  <span className={styles.statTitle}>Active In Stock</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconViolet}`}>
                  <span className="material-icons-round">groups</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{(store.followersCount ?? 0).toLocaleString()}</span>
                  <span className={styles.statTitle}>Store Followers</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
                  <span className="material-icons-round">account_balance_wallet</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{currency.format(stats.totalValuation)}</span>
                  <span className={styles.statTitle}>Catalog Value</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIconWrap} ${styles.statIconRose}`}>
                  <span className="material-icons-round">star</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>{(store.rating ?? 5.0).toFixed(1)} ★</span>
                  <span className={styles.statTitle}>{store.reviewsCount ?? 0} Customer Reviews</span>
                </div>
              </div>

              <Link
                href="/account/manage-store?tab=referrals"
                className={styles.statCard}
                style={{ textDecoration: "none", cursor: "pointer", border: "1px solid #a7f3d0", background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)" }}
              >
                <div className={styles.statIconWrap} style={{ background: "#ecfdf5", color: "#059669" }}>
                  <span className="material-icons-round">card_giftcard</span>
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue} style={{ color: "#065f46" }}>
                    ₦{(store.referralEarnings || (store.referralsCount || 0) * 1000).toLocaleString()}
                  </span>
                  <span className={styles.statTitle} style={{ color: "#047857", fontWeight: 700 }}>
                    Refer &amp; Earn (₦1k/store) →
                  </span>
                </div>
              </Link>
            </div>
          </>
        )}

          {/* Catalog Management Card */}
          <section className={styles.catalogCard}>
            <div className={styles.catalogHeader}>
              <div className={styles.catalogHeaderTitle}>
                <h2>Products Inventory</h2>
                <span className={styles.countBadge}>{filteredProducts.length} Items</span>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.addProductBtn}
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                >
                  <span className="material-icons-round">add</span>
                  Add New Product
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
              <div className={styles.searchBox}>
                <span className="material-icons-round">search</span>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search products by title, SKU, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.filterControls}>
                <select
                  className={styles.statusFilterSelect}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Stock Status</option>
                  <option value="IN_STOCK">In Stock (10+)</option>
                  <option value="LOW_STOCK">Low Stock (1-9)</option>
                  <option value="OUT_OF_STOCK">Out of Stock (0)</option>
                </select>

                {categoriesList.length > 1 && (
                  <select
                    className={styles.statusFilterSelect}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                {/* View Mode Switcher */}
                <div className={styles.viewModeToggle} role="group" aria-label="View Mode">
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === "grid" ? styles.viewModeBtnActive : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                    aria-label="Grid View"
                  >
                    <span className="material-icons-round" style={{ fontSize: "19px" }}>grid_view</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === "table" ? styles.viewModeBtnActive : ""}`}
                    onClick={() => setViewMode("table")}
                    title="Table View"
                    aria-label="Table View"
                  >
                    <span className="material-icons-round" style={{ fontSize: "19px" }}>view_list</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Display (Grid or Table) */}
            {filteredProducts.length > 0 ? (
              viewMode === "grid" ? (
                <div className={styles.productsGrid}>
                  {filteredProducts.map((p) => {
                    const stockNum = p.stock ?? 0;
                    const isOutOfStock = stockNum <= 0;
                    const isLowStock = stockNum > 0 && stockNum < 10;
                    const isInStock = stockNum >= 10;
                    const discount =
                      p.discountPercentage ||
                      (p.oldPrice && p.oldPrice > p.price
                        ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
                        : undefined);

                    return (
                      <div
                        key={p.id}
                        className={styles.productCard}
                        onClick={() => setSelectedProductForDetails(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedProductForDetails(p);
                          }
                        }}
                      >
                        <div className={styles.productCardImageWrap}>
                          <img
                            src={p.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80"}
                            alt={p.name}
                            className={styles.productCardImage}
                          />
                          <div className={styles.productCardBadges}>
                            <div>
                              {isInStock && (
                                <span className={styles.stockBadgeIn}>
                                  <span className="material-icons-round" style={{ fontSize: "12px" }}>check</span>
                                  In Stock ({stockNum})
                                </span>
                              )}
                              {isLowStock && (
                                <span className={styles.stockBadgeLow}>
                                  <span className="material-icons-round" style={{ fontSize: "12px" }}>priority_high</span>
                                  Low Stock ({stockNum})
                                </span>
                              )}
                              {isOutOfStock && (
                                <span className={styles.stockBadgeOut}>
                                  <span className="material-icons-round" style={{ fontSize: "12px" }}>close</span>
                                  Out of Stock
                                </span>
                              )}
                            </div>
                            {discount && (
                              <span className={styles.productCardDiscount}>-{discount}%</span>
                            )}
                          </div>
                          <div className={styles.productCardOverlay}>
                            <span className={styles.cardQuickViewBtn}>
                              <span className="material-icons-round" style={{ fontSize: "16px" }}>visibility</span>
                              View Details
                            </span>
                          </div>
                        </div>
                        <div className={styles.productCardContent}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                            <span className={styles.productCardCategory}>{p.category}</span>
                          </div>
                          <h3 className={styles.productCardTitle} title={p.name}>{p.name}</h3>
                          {p.sku && <span className={styles.productCardSku}>SKU: {p.sku}</span>}
                          <div className={styles.productCardMeta}>
                            <div className={styles.productCardPriceBox}>
                              <span className={styles.productCardPrice}>{currency.format(p.price)}</span>
                              {p.oldPrice && p.oldPrice > p.price && (
                                <span className={styles.productCardOldPrice}>{currency.format(p.oldPrice)}</span>
                              )}
                            </div>
                            <div className={styles.productCardQuickActions}>
                              <button
                                type="button"
                                className={styles.editBtn}
                                onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setIsProductModalOpen(true); }}
                                title="Edit Product"
                              >
                                <span className="material-icons-round" style={{ fontSize: "16px" }}>edit</span>
                              </button>
                              <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); setIsDeleteModalOpen(true); }}
                                title="Delete Product"
                              >
                                <span className="material-icons-round" style={{ fontSize: "16px" }}>delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.tableResponsive}>
                  <table className={styles.productsTable}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Inventory Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const stockNum = p.stock ?? 0;
                        return (
                          <tr
                            key={p.id}
                            className={styles.productRow}
                            onClick={() => setSelectedProductForDetails(p)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <div className={styles.productCellMain}>
                                <img
                                  src={p.image || "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80"}
                                  alt={p.name}
                                  className={styles.productThumb}
                                />
                                <div className={styles.productTitleBlock}>
                                  <span className={styles.productTitle}>{p.name}</span>
                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
                                    {p.sku && <span className={styles.productSku}>SKU: {p.sku}</span>}

                                  </div>
                                </div>
                              </div>
                            </td>
                            <td><span className={styles.categoryTag}>{p.category}</span></td>
                            <td>
                              <div className={styles.priceBlock}>
                                <span className={styles.currentPrice}>{currency.format(p.price)}</span>
                                {p.oldPrice && p.oldPrice > p.price && (
                                  <span className={styles.oldPriceStrike}>{currency.format(p.oldPrice)}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {stockNum >= 10 && (
                                <span className={styles.stockBadgeIn}>
                                  <span className="material-icons-round" style={{ fontSize: "14px" }}>check</span>
                                  In Stock ({stockNum})
                                </span>
                              )}
                              {stockNum > 0 && stockNum < 10 && (
                                <span className={styles.stockBadgeLow}>
                                  <span className="material-icons-round" style={{ fontSize: "14px" }}>priority_high</span>
                                  Low Stock ({stockNum})
                                </span>
                              )}
                              {stockNum <= 0 && (
                                <span className={styles.stockBadgeOut}>
                                  <span className="material-icons-round" style={{ fontSize: "14px" }}>close</span>
                                  Out of Stock (0)
                                </span>
                              )}
                            </td>
                            <td>
                              <div className={styles.actionBtns}>

                                <button
                                  type="button"
                                  className={styles.editBtn}
                                  onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setIsProductModalOpen(true); }}
                                  title="Edit Product"
                                >
                                  <span className="material-icons-round" style={{ fontSize: "16px" }}>edit</span>
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteBtn}
                                  onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); setIsDeleteModalOpen(true); }}
                                  title="Delete Product"
                                >
                                  <span className="material-icons-round" style={{ fontSize: "16px" }}>delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <span className="material-icons-round">inventory_2</span>
                </div>
                <h3 className={styles.emptyStateTitle}>No Products Found</h3>
                <p className={styles.emptyStateSub}>
                  {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
                    ? "No items match your current filter criteria. Try resetting filters."
                    : "Your store catalog is currently empty. Click '+ Add First Product' to start building your catalog."}
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", marginTop: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={styles.addProductBtn}
                    onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                  >
                    <span className="material-icons-round">add</span>
                    Add First Product
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {selectedProductForDetails && (
        <ProductDetailsModal
          product={selectedProductForDetails}
          currencyFormatter={currency}
          onClose={() => setSelectedProductForDetails(null)}
          onEdit={(prod) => { setSelectedProductForDetails(null); setEditingProduct(prod); setIsProductModalOpen(true); }}
          onDelete={(prod) => { setSelectedProductForDetails(null); setDeletingProduct(prod); setIsDeleteModalOpen(true); }}
        />
      )}
      {isProductModalOpen && (
        <ProductFormModal
          productToEdit={editingProduct}
          storeCategory={store.category}
          storeName={store.name}
          onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
        />
      )}
      {isDeleteModalOpen && deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          isDeleting={isDeletingProduct}
          onClose={() => { setIsDeleteModalOpen(false); setDeletingProduct(null); }}
          onConfirm={handleConfirmDelete}
        />
      )}
      {isEditStoreModalOpen && (
        <EditStoreModal
          store={store}
          onClose={() => setIsEditStoreModalOpen(false)}
          onSave={handleSaveStoreDetails}
        />
      )}
      {isUpgradeModalOpen && (
        <UpgradeToPremiumModal
          store={store}
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgradeSuccess={(updated) => {
            setStore(updated);
            onShowToast(`🎉 Upgraded! ${updated.slug}.devico.online is now live.`);
          }}
        />
      )}
    </div>
  );
}
