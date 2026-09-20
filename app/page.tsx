"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "./home.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
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

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const initialSearch = searchParams?.get("search") || "";
  const initialCat = searchParams?.get("category") || "All";

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCat);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      return Object.values(cartObj).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0,
      );
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
        const count = Object.values(cartObj).reduce(
          (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
          0,
        );
        setCartCount(count);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === "All" || product.category === category) &&
          (product.name.toLowerCase().includes(search.toLowerCase()) ||
            (product.author &&
              product.author.toLowerCase().includes(search.toLowerCase()))),
      ),
    [category, search],
  );

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

      const newCount = Object.values(existing).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0,
      );
      setCartCount(newCount);
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

  const handleCreateStore = () => {
    setSidebarOpen(false);
    setToast("Create store is coming soon");
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
