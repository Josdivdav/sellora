"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import styles from "./home.module.css";
import { useAuth } from "@/context/AuthContext";
import { fetchUserData, SignOut } from "@/functions/home.func";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/product";
import {
  HomeHeader,
  Sidebar,
  CategoryFilter,
  ProductGrid,
  Toast,
} from "@/components/home";

function readCartCount(): number {
  try {
    const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
    return Object.values(cartObj).reduce(
      (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
      0,
    );
  } catch {
    return 0;
  }
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const initialSearch = searchParams?.get("search") || "";
  const initialCat = searchParams?.get("category") || "All";

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [cartCount, setCartCount] = useState<number>(0);
  const [hasStore, setHasStore] = useState<boolean>(false);

  // Live database products state
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>(["All"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch products live directly from database API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/products", {
        cache: "no-store",
      });
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
    } catch (err: any) {
      console.error("Error fetching live products from db:", err);
      setFetchError(err?.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

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
          <CategoryFilter
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
          />

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
          ) : (
            <ProductGrid
              category={category}
              products={visibleProducts}
              isLoading={isLoading}
              onAddToCart={handleAddToCart}
            />
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
