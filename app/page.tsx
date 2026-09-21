"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import styles from "./home.module.css";
import { useAuth } from "@/context/AuthContext";
import { fetchUserData, SignOut } from "@/functions/home.func";
import { useRouter, useSearchParams } from "next/navigation";
import productsData from "@/data/products.json";
import type { Product } from "@/types/product";
import {
  HomeHeader,
  Sidebar,
  CategoryFilter,
  ProductGrid,
  Toast,
} from "@/components/home";

const products: Product[] = productsData as unknown as Product[];

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

  useEffect(() => {
    const update = () => setCartCount(readCartCount());
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [],
  );

  const visibleProducts = useMemo(() => products.filter((product) => (category === "All" || product.category === category) && (product.name.toLowerCase().includes(search.toLowerCase()) || (product.author && product.author.toLowerCase().includes(search.toLowerCase())))),
    [category, search]);

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

  const handleCreateStore = async () => {
    setSidebarOpen(false);
    router.push("/account/create-store");
  };

  const manageStore = () => {
    setSidebarOpen(false);
    router.push("/account/create-store");
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
          onCreateStore={handleCreateStore}
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

          <ProductGrid
            category={category}
            products={visibleProducts}
            onAddToCart={handleAddToCart}
          />
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
