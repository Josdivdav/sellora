"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import styles from "@/app/home.module.css";
import { useAuth } from "@/context/AuthContext";
import { fetchUserData, SignOut } from "@/functions/home.func";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
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

function readCartCount(): number {
  try {
    const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
    return Object.values(cartObj).reduce(
      (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
      0
    );
  } catch {
    return 0;
  }
}

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

  const initialSearch = searchParams?.get("search") || "";
  const initialCat = searchParams?.get("category") || "All";
  const initialStore = searchParams?.get("store") || "";

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [classificationMode, setClassificationMode] = useState<"category" | "store">(
    initialStore ? "store" : "category"
  );
  const [selectedStore, setSelectedStore] = useState<string>(initialStore || "All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [cartCount, setCartCount] = useState<number>(0);
  const [hasStore, setHasStore] = useState<boolean>(false);

  // Initialize directly from server pre-rendered products for instant loading
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [dbCategories, setDbCategories] = useState<string[]>(initialCategories);
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isLoading, setIsLoading] = useState<boolean>(initialProducts.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    // Only fetch client-side if server returned no products
    if (initialProducts.length === 0) {
      void fetchProducts();
    }
  }, [fetchProducts, initialProducts.length]);

  useEffect(() => {
    const update = () => setCartCount(readCartCount());
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
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

  // Compute visible products according to active category and search input
  const visibleProducts = useMemo(() => {
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

  // Compute products grouped by store for "All Stores" classification view
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

  // Compute products for single selected store
  const storeProducts = useMemo(() => {
    if (selectedStore === "All") return [];
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
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
  }, [products, selectedStore, search]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleAddToCart(product: Pick<Product, "id" | "name">) {
    try {
      const existing = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      existing[product.id] = (existing[product.id] || 0) + 1;
      localStorage.setItem("sellora_cart", JSON.stringify(existing));

      setCartCount(readCartCount());
      window.dispatchEvent(new Event("storage"));
      setToast(`Added "${product.name}" to cart!`);
    } catch {
      setToast(`Added "${product.name}" to cart!`);
    }
  }

  const handleSignOut = async () => {
    const success = await SignOut();
    if (success) {
      router.refresh();
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleCartClick = () => {
    router.push("/account/orders");
  };

  const checkStore = async () => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("sellora_my_store")) {
        setHasStore(true);
        return;
      }
    } catch {}
    if (user) {
      const res = await fetchUserData(user);
      if (res?.has_store) {
        setHasStore(true);
      }
    }
  };

  useEffect(() => {
    checkStore();
  }, [user]);

  const manageStore = () => {
    setSidebarOpen(false);
    router.push("/account/manage-store");
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={search}
        onSearchChange={setSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={handleCartClick}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          hasStore={hasStore}
          manageStore={manageStore}
        />

        <main className={styles.main}>
          {/* Classification Mode Toggle */}
          <div className={styles.classificationTabs} role="tablist" aria-label="Browse Classification">
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

          {fetchError && products.length === 0 ? (
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <p style={{ color: "#e11d48", fontWeight: 600, margin: "0 0 10px" }}>
                {fetchError}
              </p>
              <button
                type="button"
                onClick={fetchProducts}
                style={{
                  background: "#e11d48",
                  color: "#fff",
                  border: 0,
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retry
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
