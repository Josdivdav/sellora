"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./manage-store.module.css";
import ProductFormModal from "./ProductFormModal";
import DeleteProductModal from "./DeleteProductModal";
import EditStoreModal from "./EditStoreModal";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import type { User } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

interface ManageStoreDashboardProps {
  user: User | null;
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
    stock: 0,
    inStock: false,
    sku: "SEL-STR-003",
    tags: ["bag", "accessories", "utility"],
    createdAt: new Date().toISOString(),
  },
];

export default function ManageStoreDashboard({
  user,
  onShowToast,
}: ManageStoreDashboardProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isEditStoreModalOpen, setIsEditStoreModalOpen] = useState(false);

  // Load store and products from localStorage
  useEffect(() => {
    try {
      getStore();
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, [user]);

  async function getStore() {
    const token = await user?.getIdToken();
    if(token) {
      const response = await fetch("/api/user/store", {
        method: "GET",
        headers: {
          'authorization': 'Bearer '+token,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      setStore(result);
    }
  }

  // Persist products to localStorage
  const persistProducts = (updated: Product[], targetStore: Store | null = store) => {
    setProducts(updated);
    if (targetStore) {
      try {
        const prodKey = `sellora_merchant_products_${targetStore.id}`;
        localStorage.setItem(prodKey, JSON.stringify(updated));

        // Update product count on store object
        const updatedStore: Store = {
          ...targetStore,
          productsCount: updated.length,
          topProducts: updated.slice(0, 3).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            oldPrice: p.oldPrice,
            image: p.image,
            rating: p.rating,
          })),
        };
        setStore(updatedStore);
        localStorage.setItem("sellora_my_store", JSON.stringify(updatedStore));
        window.dispatchEvent(new Event("sellora_favorites_updated"));
      } catch {
        // ignore
      }
    }
  };

  // Add or Edit Product Handler
  const handleSaveProduct = (savedProduct: Product) => {
    if (editingProduct) {
      // Edit mode
      const updated = products.map((p) =>
        p.id === savedProduct.id ? savedProduct : p
      );
      persistProducts(updated);
      onShowToast(`Updated "${savedProduct.name}"`);
    } else {
      // Add mode
      const updated = [savedProduct, ...products];
      persistProducts(updated);
      onShowToast(`Added "${savedProduct.name}" to store catalog`);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Delete Product Handler
  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    const updated = products.filter((p) => p.id !== deletingProduct.id);
    persistProducts(updated);
    onShowToast(`Deleted "${deletingProduct.name}"`);
    setIsDeleteModalOpen(false);
    setDeletingProduct(null);
  };

  // Edit Store Details Handler
  const handleSaveStoreDetails = (updatedStore: Store) => {
    setStore(updatedStore);
    try {
      localStorage.setItem("sellora_my_store", JSON.stringify(updatedStore));
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    } catch {
      // ignore
    }
    // Also update author name in products if store name changed
    if (updatedStore.name !== store?.name) {
      const updatedProds = products.map((p) => ({
        ...p,
        author: updatedStore.name,
      }));
      persistProducts(updatedProds, updatedStore);
    }
    setIsEditStoreModalOpen(false);
    onShowToast("Storefront details updated!");
  };

  // Copy Store Link
  const handleCopyStoreLink = () => {
    if (!store) return;
    const url = `https://sellora.ng/@${store.slug}`;
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

  if (!isLoaded) {
    return null;
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
        <Link href="/create-store" className={styles.createStorePromptBtn}>
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
                  <span className={styles.slugTag}>sellora.ng/@{store.slug}</span>
                  <span>•</span>
                  <span className={styles.categoryTag}>{store.category}</span>
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
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Stats */}
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
          <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
            <span className="material-icons-round">account_balance_wallet</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{currency.format(stats.totalValuation)}</span>
            <span className={styles.statTitle}>Catalog Inventory Value</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRose}`}>
            <span className="material-icons-round">star</span>
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{parseInt(store.rating).toFixed(1)} ★</span>
            <span className={styles.statTitle}>{store.reviewsCount} Customer Reviews</span>
          </div>
        </div>
      </div>

      {/* Catalog Management Card */}
      <section className={styles.catalogCard}>
        <div className={styles.catalogHeader}>
          <div className={styles.catalogHeaderTitle}>
            <h2>Products Inventory</h2>
            <span className={styles.countBadge}>{filteredProducts.length} Items</span>
          </div>

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
          </div>
        </div>

        {/* Products Table */}
        <div className={styles.tableResponsive}>
          {filteredProducts.length > 0 ? (
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
                    <tr key={p.id} className={styles.productRow}>
                      <td>
                        <div className={styles.productCellMain}>
                          <img
                            src={p.image}
                            alt={p.name}
                            className={styles.productThumb}
                          />
                          <div className={styles.productTitleBlock}>
                            <span className={styles.productTitle}>{p.name}</span>
                            {p.sku && (
                              <span className={styles.productSku}>SKU: {p.sku}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={styles.categoryTag}>{p.category}</span>
                      </td>

                      <td>
                        <div className={styles.priceBlock}>
                          <span className={styles.currentPrice}>
                            {currency.format(p.price)}
                          </span>
                          {p.oldPrice && p.oldPrice > p.price && (
                            <span className={styles.oldPriceStrike}>
                              {currency.format(p.oldPrice)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {stockNum >= 10 && (
                          <span className={styles.stockBadgeIn}>
                            <span className="material-icons-round" style={{ fontSize: "14px" }}>
                              check
                            </span>
                            In Stock ({stockNum})
                          </span>
                        )}
                        {stockNum > 0 && stockNum < 10 && (
                          <span className={styles.stockBadgeLow}>
                            <span className="material-icons-round" style={{ fontSize: "14px" }}>
                              priority_high
                            </span>
                            Low Stock ({stockNum})
                          </span>
                        )}
                        {stockNum <= 0 && (
                          <span className={styles.stockBadgeOut}>
                            <span className="material-icons-round" style={{ fontSize: "14px" }}>
                              close
                            </span>
                            Out of Stock (0)
                          </span>
                        )}
                      </td>

                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            title="Edit Product"
                          >
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>
                              edit
                            </span>
                          </button>

                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => {
                              setDeletingProduct(p);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Product"
                          >
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <span className="material-icons-round">inventory_2</span>
              </div>
              <h3 className={styles.emptyStateTitle}>No Products Found</h3>
              <p className={styles.emptyStateSub}>
                {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
                  ? "No items match your current filter criteria. Try resetting filters."
                  : "Your store catalog is currently empty. Click '+ Add New Product' to list your first item."}
              </p>
              <button
                type="button"
                className={styles.addProductBtn}
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
              >
                <span className="material-icons-round">add</span>
                Add First Product
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <ProductFormModal
          productToEdit={editingProduct}
          storeCategory={store.category}
          storeName={store.name}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {isDeleteModalOpen && deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingProduct(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Edit Store Settings Modal */}
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
