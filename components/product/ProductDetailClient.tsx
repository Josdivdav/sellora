"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./product.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import type { Product } from "@/types/product";
import type { Store } from "@/types/store";
import storesData from "@/data/stores.json";
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
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import StoreMobileMenu from "@/components/storefront/StoreMobileMenu";
import { toggleStoreFollow } from "@/lib/followStore";
import { slugifyStoreName, getStoreRelativePath } from "@/lib/storeUrl";
import { useCart } from "@/context/CartContext";

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
  const { cartCount, addToCart } = useCart();

  // Instant state initialization from server pre-rendered product
  const [dbProduct, setDbProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProduct);

  // If server pre-render didn't find it, fetch from API fallback
  useEffect(() => {
    if (dbProduct) {
      setIsLoading(false);
      return;
    }
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadProductFallback() {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Subdomain & standalone store detection
  const [isSubdomain, setIsSubdomain] = useState<boolean>(false);
  const [activeStore, setActiveStore] = useState<Store | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname.toLowerCase();
    const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "devico.online").toLowerCase();
    const subCheck =
      (hostname.endsWith(`.${mainDomain}`) && hostname !== `www.${mainDomain}`) ||
      (hostname.endsWith(".localhost") && !hostname.startsWith("localhost"));

    setIsSubdomain(subCheck);
  }, []);

  // Capture affiliate marketing referral tracking parameter
  useEffect(() => {
    if (typeof window === "undefined" || !product?.id) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const affCode = urlParams.get("aff");
      if (affCode) {
        const attribution = {
          code: affCode.trim(),
          productId: product.id,
          storeId: product.storeId,
          timestamp: Date.now(),
        };
        localStorage.setItem(`sellora_aff_${product.id}`, JSON.stringify(attribution));
        localStorage.setItem("sellora_last_aff_attribution", JSON.stringify(attribution));
        document.cookie = `sellora_aff=${encodeURIComponent(affCode.trim())}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } catch {
      // ignore
    }
  }, [product?.id, product?.storeId]);

  // Resolve store details for this product's author / merchant
  useEffect(() => {
    if (!product?.author) return;
    const authorSlug = slugifyStoreName(product.author);

    // 1. Check local static stores
    const foundLocal = (storesData as Store[]).find(
      (s) => s.name.toLowerCase() === product.author?.toLowerCase() || s.slug === authorSlug
    );
    if (foundLocal) {
      setActiveStore(foundLocal);
      return;
    }

    // 2. Fetch live store if from database
    let isMounted = true;
    async function fetchLiveStore() {
      try {
        const res = await fetch(`/api/stores/${encodeURIComponent(authorSlug)}`);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.data?.store) {
            setActiveStore(json.data.store);
          }
        }
      } catch {
        // fallback
      }
    }

    void fetchLiveStore();
    return () => {
      isMounted = false;
    };
  }, [product?.author]);

  // Store information of currently logged in user (if any)
  const [userStore, setUserStore] = useState<{ id?: string; name?: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setUserStore(null);
      return;
    }

    const currentUser = user;
    async function loadUserStore() {
      try {
        const token = await currentUser.getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/store", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json?.data) {
            setUserStore({ ...json.data, id: currentUser.uid });
          }
        } else if (res.status === 404 && isMounted) {
          setUserStore(null);
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

  // Flag if follow API confirms user is owner of the store
  const [isOwnerFromApi, setIsOwnerFromApi] = useState<boolean>(false);

  // Check if current viewer is the author/seller of this product
  const isAuthor = useMemo(() => {
    if (isOwnerFromApi) return true;
    if (!product || !user) return false;

    // 1. Direct storeId / userId match with logged in user uid
    if (product.storeId && (user.uid === product.storeId || userStore?.id === product.storeId)) {
      return true;
    }

    // 2. User's store name matches product author (only if user actually has an active store)
    if (userStore?.name && product.author) {
      if (userStore.name.trim().toLowerCase() === product.author.trim().toLowerCase()) {
        return true;
      }
    }

    return false;
  }, [product, user, userStore, isOwnerFromApi]);

  // Wishlist state initialized safely
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);

  // Sync wishlist status from backend
  useEffect(() => {
    if (!user || !product?.id) {
      setIsWishlisted(false);
      return;
    }
    const currentUser = user;
    const currentProductId = product.id;
    let isMounted = true;
    async function fetchWishlist() {
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/user/wishlist", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          const wishlist: string[] = json.wishlist || [];
          setIsWishlisted(wishlist.includes(currentProductId));
        }
      } catch {
        // ignore
      }
    }
    fetchWishlist();
    return () => {
      isMounted = false;
    };
  }, [user, product?.id]);

  // Merchant following state & live followers count from database
  const [isFollowingStore, setIsFollowingStore] = useState<boolean>(false);
  const [merchantFollowersCount, setMerchantFollowersCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!product?.author) return;
    const currentAuthor = product.author;
    let isMounted = true;
    const authorSlug = slugifyStoreName(currentAuthor);

    async function checkFollowDb() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch(`/api/stores/${encodeURIComponent(authorSlug)}/follow`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.isOwner) {
            setIsOwnerFromApi(true);
          }
          if (typeof json.followersCount === "number") {
            setMerchantFollowersCount(json.followersCount);
          }
          if (typeof json.isFollowing === "boolean") {
            setIsFollowingStore(json.isFollowing);
          }
        }
      } catch {
        // ignore
      }
    }

    checkFollowDb();

    const handleFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (
        detail &&
        (detail.storeSlug === authorSlug ||
          detail.storeName?.toLowerCase() === currentAuthor.toLowerCase())
      ) {
        if (typeof detail.isFollowing === "boolean") setIsFollowingStore(detail.isFollowing);
        if (typeof detail.followersCount === "number") setMerchantFollowersCount(detail.followersCount);
      }
    };

    window.addEventListener("sellora_store_follow_changed", handleFollowChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("sellora_store_follow_changed", handleFollowChanged);
    };
  }, [user, product?.author]);

  // Related products
  const relatedProducts = useMemo(() => {
    return [] as Product[];
  }, []);

  const handleAddToCart = (item: Product, qty = 1) => {
    if (isAuthor) {
      setToast("You cannot add your own product to cart.");
      return;
    }
    addToCart(item.id, qty);
    setToast(`Added ${qty}x "${item.name}" to cart!`);
  };

  const handleBuyNow = async (item: Product, qty = 1) => {
    if (isAuthor) {
      setToast("You cannot purchase your own product.");
      return;
    }

    await addToCart(item.id, qty);
    if (!user) {
      setToast("Please sign in to complete your checkout.");
      router.push(`/login?redirect=/checkout`);
      return;
    }

    router.push("/checkout");
  };

  const handleToggleWishlist = async (item: Product) => {
    if (isAuthor) {
      setToast("You cannot wishlist your own product.");
      return;
    }
    if (!user) {
      setToast("Please sign in to save items to your wishlist.");
      router.push(`/login?redirect=/products/${item.id}`);
      return;
    }

    const nextState = !isWishlisted;
    setIsWishlisted(nextState);
    setToast(nextState ? "Saved to your wishlist!" : "Removed from your wishlist");

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/wishlist", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle",
          productId: item.id,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.isWishlisted === "boolean") {
          setIsWishlisted(json.isWishlisted);
        }
      }
    } catch {
      // Revert if failed
      setIsWishlisted(!nextState);
      setToast("Failed to update wishlist");
    }
  };

  const handleShare = (item: Product) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setToast(`Link for "${item.name}" copied to clipboard!`);
    }
  };

  const handleFollowStoreToggle = async () => {
    if (!product?.author) return;

    if (!user) {
      setToast("Please sign in to follow this store.");
      router.push("/login");
      return;
    }

    if (isAuthor) {
      setToast("You cannot follow your own store.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const authorSlug = slugifyStoreName(product.author);
      const res = await toggleStoreFollow({
        storeSlug: authorSlug,
        storeName: product.author,
        token,
        isLoggedIn: true,
        isOwner: isAuthor,
      });

      if (!res.success) {
        setToast(res.message || "Failed to update follow status.");
      } else {
        if (typeof res.isFollowing === "boolean") setIsFollowingStore(res.isFollowing);
        if (typeof res.followersCount === "number") setMerchantFollowersCount(res.followersCount);
        setToast(
          res.message ||
            (res.isFollowing
              ? `Following ${product.author}!`
              : `Unfollowed ${product.author}.`)
        );
      }
    } catch {
      setToast("Error updating follow status.");
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
          onCartClick={() => router.push("/cart")}
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

  // Standalone Storefront View for custom subdomains (e.g. joshua.devico.online/products/123)
  if (isSubdomain && activeStore) {
    return (
      <div className={styles.page}>
        <StoreHeader
          store={activeStore}
          isSubdomain={true}
          searchQuery=""
          onSearchChange={(q) => router.push(`/?search=${encodeURIComponent(q)}`)}
          cartCount={cartCount}
          onCartClick={() => router.push("/cart")}
          activeTab="products"
          onTabChange={(tab) => router.push(`/?tab=${tab}`)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          availableCategories={[]}
          selectedCategory="All"
          onSelectCategory={(cat) => router.push(`/?category=${encodeURIComponent(cat)}`)}
          isFollowing={isFollowingStore}
          onToggleFollow={handleFollowStoreToggle}
          onShare={() => handleShare(product)}
          isOwner={isAuthor}
        />

        <StoreMobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          store={activeStore}
          activeTab="products"
          onTabChange={(tab) => router.push(`/?tab=${tab}`)}
          availableCategories={[]}
          selectedCategory="All"
          onSelectCategory={(cat) => router.push(`/?category=${encodeURIComponent(cat)}`)}
          onShare={() => handleShare(product)}
        />

        <div className={styles.contentArea}>
          <main className={styles.main}>
            {/* Standalone Breadcrumbs */}
            <div className={styles.breadcrumbsRow}>
              <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                <Link href="/" className={styles.breadcrumbLink}>
                  {activeStore.name}
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
                Back to {activeStore.name}
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
                followersCount={merchantFollowersCount}
                store={activeStore}
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

        <StoreFooter store={activeStore} />
        <Toast message={toast} />
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
        onCartClick={() => router.push("/cart")}
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
              {product.author && (
                <>
                  <span>/</span>
                  <Link
                    href={getStoreRelativePath(product.author)}
                    className={styles.breadcrumbLink}
                  >
                    {product.author}
                  </Link>
                </>
              )}
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

            <Link
              href={product.author ? getStoreRelativePath(product.author) : "/"}
              className={styles.backLink}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                arrow_back
              </span>
              Back to {product.author || "Browse"}
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
              followersCount={merchantFollowersCount}
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
