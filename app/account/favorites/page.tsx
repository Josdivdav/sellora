"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "@/components/favorites/favorites.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter } from "next/navigation";
import initialStoresData from "@/data/stores.json";
import type { Store } from "@/types/store";
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
  Toast,
} from "@/components/favorites";

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount } = useCart();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const [allStores, setAllStores] = useState<Store[]>(initialStoresData as Store[]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [headerSearch, setHeaderSearch] = useState("");
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("POPULAR");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Load followed stores and live stores from database
  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadFollowedStoresFromDb() {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/followed-stores", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          if (Array.isArray(json.followedIds)) {
            setFavoriteIds(json.followedIds);
          }
          if (Array.isArray(json.stores) && json.stores.length > 0) {
            setAllStores(json.stores);
          }
        }
      } catch (err) {
        console.warn("Could not load followed stores from DB:", err);
      }
    }

    loadFollowedStoresFromDb();

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
  }, [user]);

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
      router.push("/login");
      return;
    }

    // 2. Guard: Check if owner
    const isOwner = user.uid === store.id || (store as any).userId === user.uid;
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
        isOwner: false,
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

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allStores.forEach((s) => cats.add(s.category));
    return ["All", ...Array.from(cats)];
  }, [allStores]);

  // Favorited stores list
  const favoritedStores = useMemo(() => {
    return allStores.filter((s) => favoriteIds.includes(s.id));
  }, [allStores, favoriteIds]);

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
        const matchName = store.name.toLowerCase().includes(query);
        const matchCat = store.category.toLowerCase().includes(query);
        const matchLoc = store.location.toLowerCase().includes(query);
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

  // Discover stores (unfollowed stores)
  const discoverStores = useMemo(() => {
    return allStores.filter((s) => !favoriteIds.includes(s.id));
  }, [allStores, favoriteIds]);

  const handleSignOut = async () => {
    await SignOut();
    router.replace("/");
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleVisitStore = (store: Store) => {
    router.push(getStoreRelativePath(store));
  };

  const handleMessageStore = (store: Store) => {
    setToast(`Connected with ${store.name} customer service.`);
  };

  const handleProductClick = (store: Store, productId: string) => {
    router.push(`/products/${productId}`);
  };

  if (!authLoading && !user) {
    return null;
  }

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
                Favorite Stores
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
              Keep track of your top-rated merchants, handcrafted studios, and exclusive store sales.
            </p>
          </div>

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

          {/* Stores Grid */}
          {displayedStores.length > 0 ? (
            <div className={styles.storesGrid}>
              {displayedStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isFavorite={true}
                  isOwner={user?.uid === store.id || (store as any).userId === user?.uid}
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
                  : "You are not following any stores in this category yet. Explore popular stores below!"}
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

          {/* Discover More Stores Section */}
          {discoverStores.length > 0 && (
            <section className={styles.discoverSection}>
              <div className={styles.discoverHeading}>
                <h2>
                  <span className="material-icons-round">explore</span>
                  Discover Verified Stores
                </h2>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Recommended merchants based on shopper reviews
                </span>
              </div>

              <div className={styles.storesGrid}>
                {discoverStores.map((store) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    isFavorite={false}
                    isOwner={user?.uid === store.id || (store as any).userId === user?.uid}
                    onToggleFavorite={handleToggleFavorite}
                    onVisitStore={handleVisitStore}
                    onMessageStore={handleMessageStore}
                    onProductClick={handleProductClick}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
