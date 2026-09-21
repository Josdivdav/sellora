"use client";

import { useMemo, useState, useEffect } from "react";
import styles from "@/components/favorites/favorites.module.css";
import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter } from "next/navigation";
import initialStoresData from "@/data/stores.json";
import type { Store } from "@/types/store";
import {
  HomeHeader,
  Sidebar,
  StoreCard,
  StoreFilterBar,
  StoreStatsHeader,
  Toast,
} from "@/components/favorites";

const STORAGE_FAVORITES_KEY = "sellora_favorite_stores";

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const allStores = initialStoresData as Store[];

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return allStores.filter((s) => s.isFavorite).map((s) => s.id);
    }
    try {
      const stored = localStorage.getItem(STORAGE_FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return allStores.filter((s) => s.isFavorite).map((s) => s.id);
  });

  const [headerSearch, setHeaderSearch] = useState("");
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("POPULAR");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Cart count state
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

  const saveFavorites = (newIds: string[]) => {
    setFavoriteIds(newIds);
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(newIds));
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    } catch {
      // ignore
    }
  };

  const handleToggleFavorite = (store: Store) => {
    const isCurrentlyFav = favoriteIds.includes(store.id);
    let updated: string[];
    if (isCurrentlyFav) {
      updated = favoriteIds.filter((id) => id !== store.id);
      setToast(`Removed ${store.name} from favorite stores`);
    } else {
      updated = [...favoriteIds, store.id];
      setToast(`Followed ${store.name}! You will receive new arrival updates.`);
    }
    saveFavorites(updated);
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
    const success = await SignOut();
    if (success) {
      router.refresh();
    }
  };

  const handleSignIn = () => {
    router.push("/login");
  };

  const handleVisitStore = (store: Store) => {
    router.push(`/?store=${encodeURIComponent(store.name)}`);
  };

  const handleMessageStore = (store: Store) => {
    setToast(`Connected with ${store.name} customer service.`);
  };

  const handleProductClick = (store: Store, productId: string) => {
    setToast(`Viewing product from ${store.name}...`);
    router.push(`/?search=${encodeURIComponent(store.name)}`);
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/")}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={handleSignIn}
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
