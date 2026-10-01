"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import styles from "@/app/home.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import {
  HomeHeader,
  Sidebar,
  CategoryFilter,
  StoreFilter,
  StoreBanner,
  StoreGroupSection,
  StoreQuickBar,
  ProductGrid,
  Toast,
} from "@/components/home";
import storesData from "@/data/stores.json";
import type { Store } from "@/types/store";
import type { StoreFilterItem } from "@/components/home/StoreFilter";
import { useCart } from "@/context/CartContext";

export type SortOption =
  | "FEATURED"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "RATING"
  | "NEWEST";

interface HomeClientProps {
  initialProducts?: Product[];
  initialCategories?: string[];
  initialStores?: Store[];
}

export default function HomeClient({
  initialProducts = [],
  initialCategories = ["All"],
  initialStores = [],
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hasStore = useStoreStatus();

  // Read initial states from URL or props
  const initialSearch = searchParams?.get("search") || "";
  const initialCat = searchParams?.get("category") || "All";
  const initialStore = searchParams?.get("store") || "All";
  const initialMode =
    (searchParams?.get("mode") as "category" | "store") ||
    (initialStore !== "All" ? "store" : "category");
  const initialSort = (searchParams?.get("sort") as SortOption) || "FEATURED";

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [classificationMode, setClassificationMode] = useState<"category" | "store">(initialMode);
  const [selectedStore, setSelectedStore] = useState<string>(initialStore);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const { cartCount, addToCart } = useCart();

  // Initialize directly from server pre-rendered products for instant loading
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [dbCategories, setDbCategories] = useState<string[]>(initialCategories);
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isLoading, setIsLoading] = useState<boolean>(initialProducts.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  // Background refresh or fallback if initialProducts was empty
  const fetchProducts = useCallback(async () => {
    if (products.length === 0) {
      setIsLoading(true);
    }
    setFetchError(null);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error("Failed to load products from database");
      }
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setDbCategories(data.categories);
      }
      if (Array.isArray(data.stores)) {
        setStores(data.stores);
      }
    } catch (err: any) {
      console.error("Error fetching live products from db:", err);
      if (products.length === 0) {
        setFetchError(err?.message || "Failed to load products");
      }
    } finally {
      setIsLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    if (initialProducts.length === 0) {
      void fetchProducts();
    }
  }, [fetchProducts, initialProducts.length]);


  // Sync URL search parameters whenever filter states change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);

      // Search
      if (search.trim()) {
        url.searchParams.set("search", search.trim());
      } else {
        url.searchParams.delete("search");
      }

      // Category
      if (category && category !== "All") {
        url.searchParams.set("category", category);
      } else {
        url.searchParams.delete("category");
      }

      // Mode
      if (classificationMode === "store") {
        url.searchParams.set("mode", "store");
      } else {
        url.searchParams.delete("mode");
      }

      // Store
      if (selectedStore && selectedStore !== "All") {
        url.searchParams.set("store", selectedStore);
      } else {
        url.searchParams.delete("store");
      }

      // Sort
      if (sortBy && sortBy !== "FEATURED") {
        url.searchParams.set("sort", sortBy);
      } else {
        url.searchParams.delete("sort");
      }

      const newRelativePath = url.pathname + (url.search ? url.search : "");
      window.history.replaceState(null, "", newRelativePath);
    }, 250);

    return () => clearTimeout(timer);
  }, [search, category, classificationMode, selectedStore, sortBy]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      setSearch(params.get("search") || "");
      setCategory(params.get("category") || "All");
      setSelectedStore(params.get("store") || "All");
      setClassificationMode(
        (params.get("mode") as "category" | "store") ||
          (params.get("store") ? "store" : "category")
      );
      setSortBy((params.get("sort") as SortOption) || "FEATURED");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Compute dynamic categories based on database products
  const categories = useMemo(() => {
    if (dbCategories.length > 1) return dbCategories;
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ["All", ...cats];
  }, [dbCategories, products]);

  // Compute unique stores from products and match with database stores
  const storeList = useMemo<StoreFilterItem[]>(() => {
    const countMap: Record<string, number> = {};
    products.forEach((p) => {
      const author = p.author?.trim() || "Sellora";
      countMap[author] = (countMap[author] || 0) + 1;
    });

    const result: StoreFilterItem[] = Object.keys(countMap).map((name) => {
      const found =
        stores.find((s) => s.name.toLowerCase() === name.toLowerCase()) ||
        (storesData as Store[]).find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        );
      return {
        name,
        logo: found?.logo,
        category: found?.category,
        count: countMap[name],
      };
    });

    return result.sort((a, b) => b.count - a.count);
  }, [products, stores]);

  // Filter products according to category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        category === "All" ||
        product.category.toLowerCase() === category.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        (product.author && product.author.toLowerCase().includes(q)) ||
        (product.category && product.category.toLowerCase().includes(q)) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.tags && product.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  // Sort filtered products
  const visibleProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "PRICE_ASC":
        return list.sort((a, b) => a.price - b.price);
      case "PRICE_DESC":
        return list.sort((a, b) => b.price - a.price);
      case "RATING":
        return list.sort((a, b) => (Number(b.rating) || 5) - (Number(a.rating) || 5));
      case "NEWEST":
        return list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      case "FEATURED":
      default:
        return list;
    }
  }, [filteredProducts, sortBy]);

  // Products grouped by store for "By Store -> All Stores"
  const productsByStore = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    const q = search.trim().toLowerCase();

    products.forEach((product) => {
      const author = product.author?.trim() || "Sellora";
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        author.toLowerCase().includes(q) ||
        (product.category && product.category.toLowerCase().includes(q)) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.tags && product.tags.some((t) => t.toLowerCase().includes(q)));

      if (matchesSearch) {
        if (!groups[author]) groups[author] = [];
        groups[author].push(product);
      }
    });

    return groups;
  }, [products, search]);

  // Products for a single selected store
  const storeProducts = useMemo(() => {
    if (selectedStore === "All") return [];
    const q = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const author = product.author?.trim() || "Sellora";
      const matchesStore = author.toLowerCase() === selectedStore.toLowerCase();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        author.toLowerCase().includes(q) ||
        (product.category && product.category.toLowerCase().includes(q)) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.tags && product.tags.some((t) => t.toLowerCase().includes(q)));

      return matchesStore && matchesSearch;
    });

    switch (sortBy) {
      case "PRICE_ASC":
        return filtered.sort((a, b) => a.price - b.price);
      case "PRICE_DESC":
        return filtered.sort((a, b) => b.price - a.price);
      case "RATING":
        return filtered.sort((a, b) => (Number(b.rating) || 5) - (Number(a.rating) || 5));
      case "NEWEST":
        return filtered.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      case "FEATURED":
      default:
        return filtered;
    }
  }, [products, selectedStore, search, sortBy]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAddToCart = (product: Pick<Product, "id" | "name">) => {
    void addToCart(product.id, 1);
    setToast(`Added "${product.name}" to cart!`);
  };

  const handleSignOut = async () => {
    await SignOut();
    router.refresh();
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleCartClick = () => {
    router.push("/cart");
  };

  const handleResetAllFilters = () => {
    setSearch("");
    setCategory("All");
    setSelectedStore("All");
    setClassificationMode("category");
    setSortBy("FEATURED");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "All" ||
    (classificationMode === "store" && selectedStore !== "All") ||
    sortBy !== "FEATURED";

  return (
    <div className={styles.page}>
      <HomeHeader
        search={search}
        onSearchChange={setSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={handleCartClick}
        onLogoClick={handleResetAllFilters}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          hasStore={hasStore}
          manageStore={() => {
            setSidebarOpen(false);
            router.push("/account/manage-store");
          }}
        />

        <main className={styles.main}>
          {/* Classification Mode Toggle */}
          <div
            className={styles.classificationTabs}
            role="tablist"
            aria-label="Browse Classification"
          >
            <button
              type="button"
              role="tab"
              aria-selected={classificationMode === "category"}
              className={`${styles.classificationTab} ${
                classificationMode === "category" ? styles.classificationTabActive : ""
              }`}
              onClick={() => {
                setClassificationMode("category");
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                category
              </span>
              By Category
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={classificationMode === "store"}
              className={`${styles.classificationTab} ${
                classificationMode === "store" ? styles.classificationTabActive : ""
              }`}
              onClick={() => {
                setClassificationMode("store");
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                storefront
              </span>
              By Store
            </button>
          </div>

          {/* Filters based on active classification mode */}
          {classificationMode === "category" ? (
            <CategoryFilter
              categories={categories}
              selectedCategory={category}
              onSelectCategory={(cat) => setCategory(cat)}
            />
          ) : (
            <StoreFilter
              stores={storeList}
              selectedStore={selectedStore}
              onSelectStore={(st) => setSelectedStore(st)}
            />
          )}

          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className={styles.activeFilterBar} aria-label="Active filters">
              <span className={styles.activeFilterLabel}>Filters:</span>

              {search.trim() !== "" && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => setSearch("")}
                  title="Remove search query"
                >
                  <span>Search: &ldquo;{search.trim()}&rdquo;</span>
                  <span className={`material-icons-round ${styles.filterChipRemove}`}>
                    close
                  </span>
                </button>
              )}

              {category !== "All" && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => setCategory("All")}
                  title="Remove category filter"
                >
                  <span>Category: {category}</span>
                  <span className={`material-icons-round ${styles.filterChipRemove}`}>
                    close
                  </span>
                </button>
              )}

              {classificationMode === "store" && selectedStore !== "All" && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => setSelectedStore("All")}
                  title="View all stores"
                >
                  <span>Store: {selectedStore}</span>
                  <span className={`material-icons-round ${styles.filterChipRemove}`}>
                    close
                  </span>
                </button>
              )}

              {sortBy !== "FEATURED" && (
                <button
                  type="button"
                  className={styles.filterChip}
                  onClick={() => setSortBy("FEATURED")}
                  title="Reset sort order"
                >
                  <span>
                    Sort:{" "}
                    {sortBy === "PRICE_ASC"
                      ? "Price (Low-High)"
                      : sortBy === "PRICE_DESC"
                      ? "Price (High-Low)"
                      : sortBy === "RATING"
                      ? "Top Rated"
                      : "Newest"}
                  </span>
                  <span className={`material-icons-round ${styles.filterChipRemove}`}>
                    close
                  </span>
                </button>
              )}

              <button
                type="button"
                className={styles.clearAllFiltersBtn}
                onClick={handleResetAllFilters}
              >
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  clear_all
                </span>
                Clear All
              </button>
            </div>
          )}

          {fetchError && products.length === 0 ? (
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "16px",
                padding: "28px",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <p style={{ color: "#e11d48", fontWeight: 700, margin: "0 0 10px" }}>
                {fetchError}
              </p>
              <button
                type="button"
                onClick={fetchProducts}
                style={{
                  background: "#e11d48",
                  color: "#fff",
                  border: 0,
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retry Loading
              </button>
            </div>
          ) : classificationMode === "category" ? (
            <>
              {category === "All" && !search && storeList.length > 0 && (
                <StoreQuickBar
                  stores={storeList}
                  onSelectStore={(st) => {
                    setSelectedStore(st);
                    setClassificationMode("store");
                  }}
                  onViewAllStores={() => {
                    setSelectedStore("All");
                    setClassificationMode("store");
                  }}
                />
              )}

              <ProductGrid
                category={category}
                products={visibleProducts}
                isLoading={isLoading}
                onAddToCart={handleAddToCart}
                sortBy={sortBy}
                onSortChange={(val) => setSortBy(val as SortOption)}
                onResetFilters={handleResetAllFilters}
                searchQuery={search}
              />
            </>
          ) : (
            /* Store classification view */
            <>
              {selectedStore === "All" ? (
                <StoreGroupSection
                  productsByStore={productsByStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onAddToCart={handleAddToCart}
                  stores={stores}
                  onResetFilters={handleResetAllFilters}
                />
              ) : (
                <>
                  <StoreBanner
                    storeName={selectedStore}
                    productCount={storeProducts.length}
                    onClear={() => setSelectedStore("All")}
                    store={stores.find(
                      (s) => s.name.toLowerCase() === selectedStore.toLowerCase()
                    )}
                  />

                  <ProductGrid
                    category={selectedStore}
                    products={storeProducts}
                    isLoading={isLoading}
                    onAddToCart={handleAddToCart}
                    sortBy={sortBy}
                    onSortChange={(val) => setSortBy(val as SortOption)}
                    onResetFilters={handleResetAllFilters}
                    searchQuery={search}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
