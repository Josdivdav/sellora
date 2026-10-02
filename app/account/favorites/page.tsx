"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import styles from "@/components/favorites/favorites.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter, useSearchParams } from "next/navigation";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { getStoreRelativePath } from "@/lib/storeUrl";
import { toggleStoreFollow } from "@/lib/followStore";
import { useCart } from "@/context/CartContext";
import {
  HomeHeader,
  Sidebar,
  StoreCard,
  StoreFilterBar,
  StoreStatsHeader,
  NewArrivalsFeed,
  Toast,
} from "@/components/favorites";

function FavoritesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount, addToCart } = useCart();

  const initialTab = searchParams?.get("tab") === "feed" ? "feed" : "stores";
  const [activeTab, setActiveTab] = useState<"stores" | "feed">(initialTab);

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true);

  const [headerSearch, setHeaderSearch] = useState("");
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("POPULAR");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Sync tab with URL if changed externally
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "feed" || tabParam === "stores") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load followed stores and live stores from database
  useEffect(() => {
    let isMounted = true;

    async function loadFollowedStoresFromDb() {
      setIsLoadingFeed(true);
      setIsLoadingStores(true);
      try {
        const token = user ? await user.getIdToken() : null;
        const url = user ? "/api/user/followed-stores" : "/api/user/followed-stores?public=true";
        const res = await fetch(url, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (Array.isArray(json.followedIds)) {
            setFavoriteIds(json.followedIds);
          }
          if (Array.isArray(json.stores)) {
            setAllStores(json.stores);
          }
          if (Array.isArray(json.newArrivals)) {
            setNewArrivals(json.newArrivals);
          }
        }
      } catch (err) {
        console.warn("Could not load followed stores from DB:", err);
      } finally {
        if (isMounted) {
          setIsLoadingFeed(false);
          setIsLoadingStores(false);
        }
      }
    }

    if (!authLoading) {
      loadFollowedStoresFromDb();
    }

    const handleFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && (detail.storeId || detail.storeSlug)) {
        if (typeof detail.isFollowing === "boolean") {
          setFavoriteIds((prev) => {
            const target = detail.storeId || detail.storeSlug;
            if (detail.isFollowing) {
              return prev.includes(target) ? prev : [...prev, target];
            } else {
              return prev.filter((id) => id !== target && id !== detail.storeId && id !== detail.storeSlug);
            }
          });
        }
        if (typeof detail.followersCount === "number") {
          setAllStores((prev) =>
            prev.map((s) =>
              s.id === detail.storeId || s.slug === detail.storeSlug
                ? { ...s, followersCount: detail.followersCount }
                : s
            )
          );
        }
      }
    };

    window.addEventListener("sellora_store_follow_changed", handleFollowChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("sellora_store_follow_changed", handleFollowChanged);
    };
  }, [user, authLoading]);

  const saveFavorites = (newIds: string[]) => {
    setFavoriteIds(newIds);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    }
  };

  const handleToggleFavorite = async (store: Store) => {
    // 1. Guard: Check if logged in
    if (!user) {
      setToast("Please sign in to follow this store.");
      router.push("/login?redirect=/account/favorites");
      return;
    }

    // 2. Guard: Check if owner
    const isOwner =
      Boolean(user?.uid) &&
      (user.uid === store.id ||
        (store as any).userId === user.uid ||
        (store as any).ownerId === user.uid ||
        (store as any).isOwner === true);

    if (isOwner) {
      setToast("You cannot follow your own store.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await toggleStoreFollow({
        storeSlug: store.slug || store.id,
        storeId: store.id,
        storeName: store.name,
        token,
        isLoggedIn: true,
        isOwner: isOwner,
      });

      if (!res.success) {
        setToast(res.message || "Failed to update follow status.");
      } else {
        const isNowFollowing = Boolean(res.isFollowing);
        let updated: string[];
        if (isNowFollowing) {
          updated = Array.from(new Set([...favoriteIds, store.id]));
        } else {
          updated = favoriteIds.filter((id) => id !== store.id);
        }
        saveFavorites(updated);

        // Update live follower count in allStores list
        if (typeof res.followersCount === "number") {
          setAllStores((prev) =>
            prev.map((s) => (s.id === store.id ? { ...s, followersCount: res.followersCount! } : s))
          );
        }

        setToast(
          res.message ||
            (isNowFollowing ? `Followed ${store.name}!` : `Unfollowed ${store.name}`)
        );
      }
    } catch {
      setToast("Error updating follow status.");
    }
  };

  // Instant Add to Cart for New Arrivals Feed
  const handleAddToCart = (product: Product, quantity = 1) => {
    addToCart(product.id, quantity);
    setToast(`Added ${quantity > 1 ? `${quantity}x ` : ""}“${product.name}” to cart!`);
  };

  // Instant Buy Now for New Arrivals Feed
  const handleBuyNow = async (product: Product) => {
    await addToCart(product.id, 1);
    if (!user) {
      setToast("Please sign in to proceed with checkout.");
      router.push("/login?redirect=/checkout");
      return;
    }
    router.push("/checkout");
  };

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allStores.forEach((s) => cats.add(s.category));
    return ["All", ...Array.from(cats)];
  }, [allStores]);

  // Favorited stores list (strictly EXCLUDES owner's own store)
  const favoritedStores = useMemo(() => {
    return allStores.filter((s) => {
      const isMine = user?.uid
        ? s.id === user.uid ||
          (s as any).userId === user.uid ||
          (s as any).ownerId === user.uid ||
          (s as any).isOwner === true
        : false;
      if (isMine) return false;
      return favoriteIds.includes(s.id) || (Boolean(s.slug) && favoriteIds.includes(s.slug));
    });
  }, [allStores, favoriteIds, user]);

  // Filtered and sorted followed stores
  const displayedStores = useMemo(() => {
    const query = (storeSearchQuery || headerSearch).trim().toLowerCase();

    const filtered = favoritedStores.filter((store) => {
      // Category filter
      if (selectedCategory !== "All" && store.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (query) {
        const matchName = (store.name || "").toLowerCase().includes(query);
        const matchCat = (store.category || "").toLowerCase().includes(query);
        const matchLoc = (store.location || "").toLowerCase().includes(query);
        const matchTags = store.tags?.some((t) =>
          t.toLowerCase().includes(query),
        );
        if (!matchName && !matchCat && !matchLoc && !matchTags) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "RATING") return b.rating - a.rating;
      if (sortBy === "NAME") return a.name.localeCompare(b.name);
      return b.followersCount - a.followersCount;
    });
  }, [
    favoritedStores,
    selectedCategory,
    storeSearchQuery,
    headerSearch,
    sortBy,
  ]);

  // Discover stores (real unfollowed stores, strictly EXCLUDES owner's own store)
  const discoverStores = useMemo(() => {
    return allStores.filter((s) => {
      const isMine = user?.uid
        ? s.id === user.uid ||
          (s as any).userId === user.uid ||
          (s as any).ownerId === user.uid ||
          (s as any).isOwner === true
        : false;
      if (isMine) return false;
      return !favoriteIds.includes(s.id) && (!s.slug || !favoriteIds.includes(s.slug));
    });
  }, [allStores, favoriteIds, user]);

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  const handleSignIn = () => {
    router.push("/login?redirect=/account/favorites");
  };

  const handleVisitStore = (store: Store) => {
    router.push(getStoreRelativePath(store));
  };

  const handleMessageStore = (store: Store) => {
    const cleanPhone = (
      (store as any).whatsapp ||
      (store as any).phone ||
      (store as any).whatsappPhone ||
      "08038737198"
    ).replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `234${cleanPhone.slice(1)}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
      `Hello ${store.name}! I found your store on Sellora and would like to inquire about your products.`
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleProductClick = (store: Store, productId: string) => {
    router.push(`/products/${productId}`);
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
          hasStore={hasStore}
        />

        <main className={styles.main}>
          <div className={styles.pageHeading}>
            <div className={styles.titleRow}>
              <h1>
                <span className="material-icons-round">favorite</span>
                Favorite Stores &amp; Drops
              </h1>
              <span
                style={{
                  fontSize: "13px",
                  background: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "50px",
                  border: "1px solid #e5e7eb",
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                {favoritedStores.length} {favoritedStores.length === 1 ? "store" : "stores"} followed
              </span>
            </div>
            <p className={styles.subtitle}>
              Keep track of your top-rated merchants, handcrafted studios, and get a live stream of fresh product arrivals.
            </p>
          </div>

          {/* Guest Sign-In Invitation Banner if Unauthenticated */}
          {!authLoading && !user && (
            <div className={styles.guestCard}>
              <div className={styles.guestLeft}>
                <div className={styles.guestIconWrap}>
                  <span className="material-icons-round">loyalty</span>
                </div>
                <div>
                  <h3 className={styles.guestTitle}>Sign in to save your favorite stores</h3>
                  <p className={styles.guestDesc}>
                    Keep track of your favorite sellers, receive alerts when they drop new collections, and enjoy a personalized shopping stream.
                  </p>
                </div>
              </div>
              <div className={styles.guestActions}>
                <Link href="/login?redirect=/account/favorites" className={styles.guestSignInBtn}>
                  <span className="material-icons-round" style={{ fontSize: "17px" }}>
                    login
                  </span>
                  Sign In
                </Link>
                <Link href="/signup?redirect=/account/favorites" className={styles.guestRegisterBtn}>
                  Create Free Account
                </Link>
              </div>
            </div>
          )}

          {/* Main View Tabs: Followed Stores vs New Arrivals Feed */}
          <div className={styles.tabsRow} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "stores"}
              className={`${styles.tabBtn} ${activeTab === "stores" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("stores")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                storefront
              </span>
              <span>Followed Stores</span>
              <span className={styles.tabBadge}>{favoritedStores.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "feed"}
              className={`${styles.tabBtn} ${activeTab === "feed" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("feed")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                auto_awesome
              </span>
              <span>New Arrivals Feed</span>
              <span
                className={`${styles.tabBadge} ${
                  newArrivals.length > 0 ? styles.tabBadgeNew : ""
                }`}
              >
                {newArrivals.length > 0 ? `${newArrivals.length} New` : "Feed"}
              </span>
            </button>
          </div>

          {/* TAB 1: Followed Stores View */}
          {activeTab === "stores" && (
            <>
              {/* Stats Bar */}
              <StoreStatsHeader favoriteStores={favoritedStores} />

              {/* Filter Bar */}
              <StoreFilterBar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={storeSearchQuery}
                onSearchChange={setStoreSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />

              {/* Followed Stores Grid */}
              {isLoadingStores ? (
                <div className={styles.loadingSkeletonGrid}>
                  <div className={styles.skeletonStoreCard} />
                  <div className={styles.skeletonStoreCard} />
                  <div className={styles.skeletonStoreCard} />
                </div>
              ) : displayedStores.length > 0 ? (
                <div className={styles.storesGrid}>
                  {displayedStores.map((store) => (
                    <StoreCard
                      key={store.id}
                      store={store}
                      isFavorite={true}
                      isOwner={Boolean(user?.uid && (user.uid === store.id || (store as any).userId === user.uid || (store as any).ownerId === user.uid || (store as any).isOwner === true))}
                      onToggleFavorite={handleToggleFavorite}
                      onVisitStore={handleVisitStore}
                      onMessageStore={handleMessageStore}
                      onProductClick={handleProductClick}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <span className="material-icons-round">favorite_border</span>
                  </div>
                  <h3 className={styles.emptyStateTitle}>No favorite stores found</h3>
                  <p className={styles.emptyStateText}>
                    {storeSearchQuery || headerSearch
                      ? `No followed stores match "${storeSearchQuery || headerSearch}". Try adjusting your filters.`
                      : "You are not following any stores in this category yet. Explore verified merchants below!"}
                  </p>
                  {(storeSearchQuery || headerSearch || selectedCategory !== "All") && (
                    <button
                      type="button"
                      className={styles.visitStoreBtn}
                      style={{ marginTop: "8px", width: "auto", padding: "8px 20px" }}
                      onClick={() => {
                        setSelectedCategory("All");
                        setStoreSearchQuery("");
                        setHeaderSearch("");
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>
                        refresh
                      </span>
                      Reset Filters
                    </button>
                  )}
                </div>
              )}

              {/* Discover More Stores Section (Real DB Stores Only) */}
              {!isLoadingStores && discoverStores.length > 0 && (
                <section className={styles.discoverSection}>
                  <div className={styles.discoverHeading}>
                    <h2>
                      <span className="material-icons-round">explore</span>
                      Discover Verified Stores
                    </h2>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      Merchants registered on Sellora marketplace
                    </span>
                  </div>

                  <div className={styles.storesGrid}>
                    {discoverStores.map((store) => (
                      <StoreCard
                        key={store.id}
                        store={store}
                        isFavorite={false}
                        isOwner={Boolean(user?.uid && (user.uid === store.id || (store as any).userId === user.uid || (store as any).ownerId === user.uid || (store as any).isOwner === true))}
                        onToggleFavorite={handleToggleFavorite}
                        onVisitStore={handleVisitStore}
                        onMessageStore={handleMessageStore}
                        onProductClick={handleProductClick}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* TAB 2: New Arrivals Feed View */}
          {activeTab === "feed" && (
            <NewArrivalsFeed
              products={newArrivals}
              followedStores={favoritedStores}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onSwitchToStoresTab={() => setActiveTab("stores")}
            />
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <FavoritesContent />
    </Suspense>
  );
}

