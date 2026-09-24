"use client";

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import Link from "next/link";
import styles from "./manage-store.module.css";
import ProductFormModal from "./ProductFormModal";
import DeleteProductModal from "./DeleteProductModal";
import EditStoreModal from "./EditStoreModal";
import ProductDetailsModal from "./ProductDetailsModal";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import type { User } from "firebase/auth";

const MerchantOrdersTab = lazy(() => import("./tabs/MerchantOrdersTab"));
const MerchantAnalyticsTab = lazy(() => import("./tabs/MerchantAnalyticsTab"));
const MerchantPromotionsTab = lazy(() => import("./tabs/MerchantPromotionsTab"));
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

const DEFAULT_STARTER_PRODUCTS: Product[] = [
  {
    id: "p-init-1",
    name: "Signature Streetwear Oversized Hoodie",
    slug: "signature-streetwear-oversized-hoodie",
    category: "Fashion & Apparel",
    price: 38000,
    oldPrice: 45000,
    currency: "NGN",
    rating: 4.8,
    reviewsCount: 14,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80"],
    author: "My Store",
    description: "Heavyweight 400GSM cotton fleece with drop shoulders and embroidered chest logo.",
    stock: 24,
    inStock: true,
    sku: "SEL-STR-001",
    tags: ["hoodie", "streetwear", "winter"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "p-init-2",
    name: "Minimalist Italian Leather Sneakers",
    slug: "minimalist-italian-leather-sneakers",
    category: "Fashion & Apparel",
    price: 52000,
    oldPrice: 65000,
    currency: "NGN",
    rating: 4.9,
    reviewsCount: 28,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80"],
    author: "My Store",
    description: "Handcrafted white calfskin leather sneakers with vulcanized rubber cupsole.",
    stock: 8,
    inStock: true,
    sku: "SEL-STR-002",
    tags: ["sneakers", "footwear", "luxury"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "p-init-3",
    name: "Tactical Crossbody Utility Messenger",
    slug: "tactical-crossbody-utility-messenger",
    category: "Fashion & Apparel",
    price: 24000,
    oldPrice: 30000,
    currency: "NGN",
    rating: 4.7,
    reviewsCount: 9,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"],
    author: "My Store",
    description: "Water-resistant Cordura ballistic nylon with Fidlock magnetic buckle closure.",
    stock: 12,
    inStock: true,
    sku: "SEL-STR-003",
    tags: ["bag", "accessories", "utility"],
    createdAt: new Date().toISOString(),
  },
];

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

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

  // Load store and products from backend
  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      try {
        const token = await user?.getIdToken(true).catch(() => user?.getIdToken());
        if (!token) {
          setIsLoaded(true);
          return;
        }

        // Fetch store and products concurrently from backend
        const [storeRes, prodsRes] = await Promise.all([
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
        ]);

        if (storeRes.status === 404) {
          setStore(null);
          setProducts([]);
          return;
        }

        if (storeRes.status === 401) {
          console.warn("Session expired or unauthorized in manage-store");
          setStore(null);
          setProducts([]);
          return;
        }

        if (!storeRes.ok) {
          const errData = await storeRes.json().catch(() => ({}));
          console.error("Store fetch failed:", storeRes.status, errData);
          if (showRefreshing) {
            onShowToast(errData?.error || "Could not refresh store data");
          }
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

        // If backend products are empty, check if user had products in localStorage to migrate
        if (fetchedProducts.length === 0 && storeData?.id) {
          try {
            const localKey = `sellora_merchant_products_${storeData.id}`;
            const local = localStorage.getItem(localKey);
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Auto-sync local products to backend
                const syncRes = await fetch("/api/user/store/products", {
                  method: "POST",
                  headers: {
                    authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ action: "batch", products: parsed }),
                });
                if (syncRes.ok) {
                  const syncJson = await syncRes.json();
                  fetchedProducts = syncJson.products || parsed;
                  onShowToast(`Synced ${fetchedProducts.length} local items to backend`);
                }
              }
            }
          } catch {
            // ignore
          }
        }

        setProducts(fetchedProducts);

        // Keep local cache in sync for offline/quick access
        if (storeData) {
          localStorage.setItem("sellora_my_store", JSON.stringify(storeData));
          if (storeData.id) {
            localStorage.setItem(
              `sellora_merchant_products_${storeData.id}`,
              JSON.stringify(fetchedProducts)
            );
          }
        }

        if (showRefreshing) {
          onShowToast("Synced latest data from backend!");
        }
      } catch (error) {
        console.error("Error loading store data from backend:", error);
        onShowToast("Unable to load latest data from backend");
      } finally {
        setIsLoaded(true);
        setIsRefreshing(false);
      }
    },
    [user, onShowToast]
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoaded(true);
      return;
    }
    void loadData(false);
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

      if (store?.id) {
        localStorage.setItem(`sellora_merchant_products_${store.id}`, JSON.stringify(updated));
      }
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
        localStorage.setItem("sellora_my_store", JSON.stringify(updatedStore));
        if (store.id) {
          localStorage.setItem(`sellora_merchant_products_${store.id}`, JSON.stringify(updated));
        }
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
        localStorage.setItem("sellora_my_store", JSON.stringify(updatedStore));
        if (store.id) {
          localStorage.setItem(`sellora_merchant_products_${store.id}`, JSON.stringify(updated));
        }
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
      localStorage.setItem("sellora_my_store", JSON.stringify(finalStore));
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

  // Seed Starter Products Handler
  const handleSeedSampleProducts = async () => {
    const token = await user?.getIdToken();
    if (!token || !store) return;

    setIsSeeding(true);
    try {
      const sampleItems = DEFAULT_STARTER_PRODUCTS.map((p) => ({
        ...p,
        author: store.name,
        category: store.category || p.category,
      }));

      const res = await fetch("/api/user/store/products", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "batch", products: sampleItems }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to seed sample products");
      }

      const newProds = result.products || sampleItems;
      setProducts(newProds);

      const updatedStore = {
        ...store,
        productsCount: newProds.length,
      };
      setStore(updatedStore);
      localStorage.setItem("sellora_my_store", JSON.stringify(updatedStore));
      if (store.id) {
        localStorage.setItem(`sellora_merchant_products_${store.id}`, JSON.stringify(newProds));
      }
      onShowToast("Seeded 3 sample products to your store catalog!");
    } catch (err: any) {
      onShowToast(err?.message || "Failed to seed sample products");
    } finally {
      setIsSeeding(false);
    }
  };

  // Copy Store Link
  const handleCopyStoreLink = () => {
    if (!store) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/@${store.slug}`
        : `${process.env.NEXT_PUBLIC_SITE_URL || ""}/@${store.slug}`;

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
              href="/account/favorites"
              className={styles.heroActionBtn}
              title="View in favorite stores"
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                favorite
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
                  <span className={styles.slugTag}>{typeof window !== "undefined" ? window.location.host : (process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "sellora")}/@{store.slug}</span>
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


      {/* ── TAB CONTENT ── */}
      <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading...</div>}>
        {activeTab === "orders" && (
          <MerchantOrdersTab store={store} currency={currency} onShowToast={onShowToast} />
        )}
        {activeTab === "analytics" && (
          <MerchantAnalyticsTab store={store} products={products} currency={currency} />
        )}
        {activeTab === "promotions" && (
          <MerchantPromotionsTab store={store} onShowToast={onShowToast} />
        )}
        {activeTab === "settings" && (
          <MerchantSettingsTab store={store} onSave={handleSaveStoreDetails} onShowToast={onShowToast} />
        )}
      </Suspense>

      {/* Dashboard tab: stats + products catalog */}
      {(!activeTab || activeTab === "dashboard" || activeTab === "products") && (
        <>
          {/* Stats Grid — only on dashboard */}
          {(!activeTab || activeTab === "dashboard") && (
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
            </div>
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
                  className={styles.syncBtn}
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                  title="Sync store and products with backend"
                >
                  <span
                    className={`material-icons-round ${isRefreshing ? styles.spinning : ""}`}
                    style={{ fontSize: "16px" }}
                  >
                    sync
                  </span>
                  {isRefreshing ? "Syncing..." : "Sync"}
                </button>

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
                          <span className={styles.productCardCategory}>{p.category}</span>
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
                                  {p.sku && <span className={styles.productSku}>SKU: {p.sku}</span>}
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
                    : "Your store catalog is currently empty. Click '+ Add New Product' or seed sample products to get started."}
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
                  {!searchQuery && statusFilter === "ALL" && categoryFilter === "ALL" && (
                    <button
                      type="button"
                      className={styles.seedBtn}
                      onClick={handleSeedSampleProducts}
                      disabled={isSeeding}
                    >
                      <span className={`material-icons-round ${isSeeding ? styles.spinning : ""}`} style={{ fontSize: "16px" }}>
                        auto_awesome
                      </span>
                      {isSeeding ? "Seeding Starter Catalog..." : "Add Sample Products"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals — always mounted regardless of tab */}
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
    </div>
  );
}
