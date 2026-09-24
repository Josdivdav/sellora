"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import styles from "@/components/product/product.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import type { Product } from "@/types/product";
import {
  HomeHeader,
  Sidebar,
  ProductGallery,
  ProductInfo,
  ProductSpecs,
  MerchantWidget,
  RelatedProducts,
  Toast,
} from "@/components/product";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  // Locate product by id or slug directly from database API
  const [dbProduct, setDbProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);

    async function loadProductFromDb() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.product && isMounted) {
            setDbProduct(data.product);
            if (isMounted) setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch product from /api/products/[id]:", err);
      }

      // Fallback: check localStorage merchant products
      if (typeof window !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("sellora_merchant_products") || key === "sellora_my_store_products")) {
              const list = JSON.parse(localStorage.getItem(key) || "[]");
              const found = list.find(
                (item: any) =>
                  item.id === id ||
                  (item.slug && item.slug.toLowerCase() === id.toLowerCase()),
              );
              if (found && isMounted) {
                setDbProduct(found);
                if (isMounted) setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // Nothing found anywhere — stop loading
      if (isMounted) setIsLoading(false);
    }

    void loadProductFromDb();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const product = useMemo(() => dbProduct, [dbProduct]);

  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Cart count state initialized safely from localStorage
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

  // Wishlist state initialized safely
  const [isWishlisted, setIsWishlisted] = useState<boolean>(() => {
    if (typeof window === "undefined" || !product) return false;
    try {
      const stored = localStorage.getItem("sellora_wishlist");
      if (stored) {
        const list = JSON.parse(stored);
        return Array.isArray(list) && list.includes(product.id);
      }
    } catch {
      // ignore
    }
    return false;
  });

  // Merchant following state
  const [isFollowingStore, setIsFollowingStore] = useState<boolean>(() => {
    if (typeof window === "undefined" || !product?.author) return false;
    try {
      const stored = localStorage.getItem("sellora_favorite_stores");
      if (stored) {
        const list = JSON.parse(stored);
        return Array.isArray(list) && list.includes(product.author);
      }
    } catch {
      // ignore
    }
    return false;
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

        if (product) {
          const stored = localStorage.getItem("sellora_wishlist");
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) setIsWishlisted(list.includes(product.id));
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [product]);

  // Related products: currently returns [] until a dedicated API is added
  const relatedProducts = useMemo(() => {
    return [] as Product[];
  }, []);

  const handleAddToCart = (item: Product, qty = 1) => {
    try {
      const existing = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      existing[item.id] = (existing[item.id] || 0) + qty;
      localStorage.setItem("sellora_cart", JSON.stringify(existing));

      const newCount = Object.values(existing).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0,
      );
      setCartCount(newCount);
      window.dispatchEvent(new Event("storage"));
      setToast(`Added ${qty}x "${item.name}" to cart!`);
    } catch {
      setToast(`Added to cart!`);
    }
  };

  const handleBuyNow = (item: Product, qty = 1) => {
    handleAddToCart(item, qty);
    router.push("/account/orders");
  };

  const handleToggleWishlist = (item: Product) => {
    try {
      const stored = localStorage.getItem("sellora_wishlist");
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      if (list.includes(item.id)) {
        list = list.filter((pid) => pid !== item.id);
        setIsWishlisted(false);
        setToast("Removed from your wishlist");
      } else {
        list.push(item.id);
        setIsWishlisted(true);
        setToast("Saved to your wishlist!");
      }
      localStorage.setItem("sellora_wishlist", JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  const handleShare = (item: Product) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setToast(`Link for "${item.name}" copied to clipboard!`);
    }
  };

  const handleFollowStoreToggle = () => {
    if (!product?.author) return;
    try {
      const stored = localStorage.getItem("sellora_favorite_stores");
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      if (list.includes(product.author)) {
        list = list.filter((s) => s !== product.author);
        setIsFollowingStore(false);
        setToast(`Unfollowed ${product.author}`);
      } else {
        list.push(product.author);
        setIsFollowingStore(true);
        setToast(`Following ${product.author}! You'll receive updates.`);
      }
      localStorage.setItem("sellora_favorite_stores", JSON.stringify(list));
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    } catch {
      setIsFollowingStore(!isFollowingStore);
    }
  };

  const handleSignOut = async () => {
    const success = await SignOut();
    if (success) {
      router.refresh();
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleCreateStore = () => {
    setSidebarOpen(false);
    router.push("/account/create-store");
  };

  const handleHeaderSearch = (val: string) => {
    setHeaderSearch(val);
    if (val.trim()) {
      router.push(`/?search=${encodeURIComponent(val)}`);
    }
  };

  if (isLoading || !product) {
    return (
      <div className={styles.page}>
        <HomeHeader
          search={headerSearch}
          onSearchChange={handleHeaderSearch}
          cartCount={cartCount}
          onOpenSidebar={() => setSidebarOpen(true)}
          onCartClick={() => router.push("/")}
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
            {isLoading ? (
              /* ── Skeleton loader ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Hero skeleton */}
                <div style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "32px",
                  boxShadow: "0 2px 8px rgba(11,18,48,0.04)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "32px",
                }}>
                  <div style={{ borderRadius: "16px", background: "#f3f4f6", aspectRatio: "1", animation: "productPageShimmer 1.4s ease infinite" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[80, 55, 40, 30, 30].map((w, i) => (
                      <div key={i} style={{ height: i === 0 ? "28px" : "16px", width: `${w}%`, borderRadius: "8px", background: "#f3f4f6", animation: "productPageShimmer 1.4s ease infinite" }} />
                    ))}
                    <div style={{ height: "48px", borderRadius: "12px", background: "#f3f4f6", marginTop: "8px", animation: "productPageShimmer 1.4s ease infinite" }} />
                  </div>
                </div>
                {/* Details row skeleton */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
                  {[1, 2].map((n) => (
                    <div key={n} style={{ background: "#ffffff", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 8px rgba(11,18,48,0.04)", display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[60, 90, 70, 50].map((w, i) => (
                        <div key={i} style={{ height: "14px", width: `${w}%`, borderRadius: "6px", background: "#f3f4f6", animation: "productPageShimmer 1.4s ease infinite" }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Product not found ── */
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "60px 24px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(11, 18, 48, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <span
                  className="material-icons-round"
                  style={{ fontSize: "54px", color: "#9ca3af" }}
                >
                  search_off
                </span>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                  Product Not Found
                </h2>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", maxWidth: "380px" }}>
                  The product you are looking for may have been removed or the link is expired.
                </p>
                <Link
                  href="/"
                  style={{
                    marginTop: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #2b6dff, #7b2ff7)",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    textDecoration: "none",
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    arrow_back
                  </span>
                  Back to Browse
                </Link>
              </div>
            )}
          </main>
        </div>

        <style>{`
          @keyframes productPageShimmer {
            0%   { opacity: 1; }
            50%  { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={handleHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/")}
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
          {/* Breadcrumbs Row */}
          <div className={styles.breadcrumbsRow}>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <Link href="/" className={styles.breadcrumbLink}>
                Home
              </Link>
              <span>/</span>
              <Link
                href={`/?category=${encodeURIComponent(product.category)}`}
                className={styles.breadcrumbLink}
              >
                {product.category}
              </Link>
              <span>/</span>
              <span className={styles.breadcrumbCurrent}>{product.name}</span>
            </nav>

            <Link href="/" className={styles.backLink}>
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                arrow_back
              </span>
              Back to Browse
            </Link>
          </div>

          {/* Product Hero Card (Gallery + Info) */}
          <section className={styles.productHeroCard}>
            <ProductGallery product={product} />

            <ProductInfo
              product={product}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onShare={handleShare}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={isWishlisted}
            />
          </section>

          {/* Secondary Details: Specifications & Merchant Profile */}
          <section className={styles.detailsGrid}>
            <ProductSpecs product={product} />

            <MerchantWidget
              authorName={product.author}
              onFollowToggle={handleFollowStoreToggle}
              isFollowing={isFollowingStore}
            />
          </section>

          {/* Related / Category Recommendations */}
          <RelatedProducts
            products={relatedProducts}
            currentProductId={product.id}
            onAddToCart={(item) => handleAddToCart(item, 1)}
          />
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
