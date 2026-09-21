"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import styles from "@/components/product/product.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import productsData from "@/data/products.json";
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

const allProducts = productsData as unknown as Product[];

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  // Locate product by id or slug
  const product = useMemo(() => {
    return allProducts.find(
      (p) => p.id === id || (p.slug && p.slug.toLowerCase() === id.toLowerCase()),
    );
  }, [id]);

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

  // Related products from the same category or author
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts.filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.author === product.author),
    );
  }, [product]);

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
    router.push("/create-store");
  };

  const handleHeaderSearch = (val: string) => {
    setHeaderSearch(val);
    if (val.trim()) {
      router.push(`/?search=${encodeURIComponent(val)}`);
    }
  };

  if (!product) {
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
          </main>
        </div>
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
