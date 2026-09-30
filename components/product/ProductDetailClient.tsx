"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./product.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
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

interface ProductDetailClientProps {
  id: string;
  initialProduct?: Product | null;
}

export default function ProductDetailClient({
  id,
  initialProduct = null,
}: ProductDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const hasStore = useStoreStatus();

  // Instant state initialization from server pre-rendered product
  const [dbProduct, setDbProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProduct);

  // If server didn't find it, check localStorage fallback or API
  useEffect(() => {
    if (dbProduct) {
      setIsLoading(false);
      return;
    }
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadProductFallback() {
      // 1. Check localStorage first (instant client fallback for newly created merchant products)
      if (typeof window !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              (key.startsWith("sellora_merchant_products") ||
                key === "sellora_my_store_products")
            ) {
              const list = JSON.parse(localStorage.getItem(key) || "[]");
              const found = list.find(
                (item: any) =>
                  item.id === id ||
                  (item.slug && item.slug.toLowerCase() === id.toLowerCase())
              );
              if (found && isMounted) {
                setDbProduct(found);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // 2. Fetch from API
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.product && isMounted) {
            setDbProduct(data.product);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch product from API fallback:", err);
      }

      if (isMounted) setIsLoading(false);
    }

    void loadProductFallback();

    return () => {
      isMounted = false;
    };
  }, [id, dbProduct]);

  const product = useMemo(() => dbProduct, [dbProduct]);

  const [headerSearch, setHeaderSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Store information of currently logged in user (if any)
  const [userStore, setUserStore] = useState<{ id?: string; name?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("sellora_my_store");
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadUserStore() {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/store", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.data) {
            setUserStore(json.data);
            try {
              localStorage.setItem("sellora_my_store", JSON.stringify(json.data));
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }

    void loadUserStore();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Check if current viewer is the author/seller of this product
  const isAuthor = useMemo(() => {
    if (!product) return false;

    // 1. Direct storeId / userId match with logged in user uid
    if (user?.uid && product.storeId && user.uid === product.storeId) {
      return true;
    }

    // 2. User's store ID matches product storeId or user uid
    if (
      userStore?.id &&
      product.storeId &&
      (userStore.id === product.storeId || userStore.id === user?.uid)
    ) {
      return true;
    }

    // 3. User's store name matches product author
    if (userStore?.name && product.author) {
      if (userStore.name.trim().toLowerCase() === product.author.trim().toLowerCase()) {
        return true;
      }
    }

    // 4. User's display name matches product author
    if (user?.displayName && product.author) {
      if (user.displayName.trim().toLowerCase() === product.author.trim().toLowerCase()) {
        return true;
      }
    }

    // 5. Product is in user's merchant products in localStorage
    if (typeof window !== "undefined") {
      try {
        const keysToCheck = [
          user?.uid ? `sellora_merchant_products_${user.uid}` : null,
          userStore?.id ? `sellora_merchant_products_${userStore.id}` : null,
          "sellora_my_store_products",
        ].filter(Boolean) as string[];

        for (const key of keysToCheck) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (
              Array.isArray(list) &&
              list.some(
                (item: any) =>
                  item.id === product.id ||
                  (item.slug && item.slug === product.slug)
              )
            ) {
              return true;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return false;
  }, [product, user, userStore]);

  // Cart count state initialized safely from localStorage
  const [cartCount, setCartCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const cartObj = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      return Object.values(cartObj).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0
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
          0
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

  // Related products
  const relatedProducts = useMemo(() => {
    return [] as Product[];
  }, []);

  const handleAddToCart = (item: Product, qty = 1) => {
    if (isAuthor) {
      setToast("You cannot add your own product to cart.");
      return;
    }
    try {
      const existing = JSON.parse(localStorage.getItem("sellora_cart") || "{}");
      existing[item.id] = (existing[item.id] || 0) + qty;
      localStorage.setItem("sellora_cart", JSON.stringify(existing));

      const newCount = Object.values(existing).reduce(
        (acc: number, cur) => acc + (typeof cur === "number" ? cur : 1),
        0
      );
      setCartCount(newCount);
      window.dispatchEvent(new Event("storage"));
      setToast(`Added ${qty}x "${item.name}" to cart!`);
    } catch {
      setToast(`Added to cart!`);
    }
  };

  const handleBuyNow = (item: Product, qty = 1) => {
    if (isAuthor) {
      setToast("You cannot purchase your own product.");
      return;
    }
    handleAddToCart(item, qty);
    router.push("/account/orders");
  };

  const handleToggleWishlist = (item: Product) => {
    if (isAuthor) {
      setToast("You cannot wishlist your own product.");
      return;
    }
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
    if (!product?.author || isAuthor) return;
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

  const handleManageStore = () => {
    setSidebarOpen(false);
    router.push("/account/manage-store");
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
            hasStore={hasStore}
            onCreateStore={handleCreateStore}
            manageStore={handleManageStore}
            onSignOut={handleSignOut}
            onSignIn={handleSignIn}
            isAuthor={isAuthor}
            product={product}
          />

          <main className={styles.main}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "32px",
                    boxShadow: "0 2px 8px rgba(11,18,48,0.04)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "32px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "16px",
                      background: "#f3f4f6",
                      aspectRatio: "1",
                      animation: "productPageShimmer 1.4s ease infinite",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[80, 55, 40, 30, 30].map((w, i) => (
                      <div
                        key={i}
                        style={{
                          height: i === 0 ? "28px" : "16px",
                          width: `${w}%`,
                          borderRadius: "8px",
                          background: "#f3f4f6",
                          animation: "productPageShimmer 1.4s ease infinite",
                        }}
                      />
                    ))}
                    <div
                      style={{
                        height: "48px",
                        borderRadius: "12px",
                        background: "#f3f4f6",
                        marginTop: "8px",
                        animation: "productPageShimmer 1.4s ease infinite",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
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
                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    fontSize: "14px",
                    maxWidth: "380px",
                  }}
                >
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
          hasStore={hasStore}
          onCreateStore={handleCreateStore}
          manageStore={handleManageStore}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          isAuthor={isAuthor}
          product={product}
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
          <section id="product-overview" className={styles.productHeroCard}>
            <ProductGallery product={product} />

            <ProductInfo
              product={product}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onShare={handleShare}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={isWishlisted}
              isAuthor={isAuthor}
            />
          </section>

          {/* Secondary Details: Specifications & Merchant Profile */}
          <section className={styles.detailsGrid}>
            <ProductSpecs id="product-specs" product={product} />

            <MerchantWidget
              id="product-seller"
              authorName={product.author}
              onFollowToggle={handleFollowStoreToggle}
              isFollowing={isFollowingStore}
              isAuthor={isAuthor}
            />
          </section>

          {/* Related / Category Recommendations */}
          <RelatedProducts
            id="product-related"
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
