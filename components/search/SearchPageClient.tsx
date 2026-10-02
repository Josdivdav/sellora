"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./search.module.css";
import type { Product } from "@/types/product";
import type { Store } from "@/types/store";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { HomeHeader, Sidebar } from "@/components/home";
import ProductCard from "@/components/home/ProductCard";
import SearchSuggestionsDropdown from "./SearchSuggestionsDropdown";
import { getStoreRelativePath } from "@/lib/storeUrl";
import { SignOut } from "@/functions/home.func";

interface SearchPageClientProps {
  initialQuery?: string;
  initialCategory?: string;
  allProducts: Product[];
  allStores: Store[];
  allCategories: string[];
}

type SortOption = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";
type PriceFilter = "all" | "under-10k" | "10k-50k" | "50k-200k" | "above-200k";

export default function SearchPageClient({
  initialQuery = "",
  initialCategory = "All",
  allProducts,
  allStores,
  allCategories,
}: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hasStore = useStoreStatus();
  const { cartCount, addToCart } = useCart();

  // Search input & active states
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

  // Suggestions & UI states
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  const searchFormRef = useRef<HTMLDivElement>(null);

  // Sync state with URL params
  useEffect(() => {
    const qFromUrl = searchParams?.get("q") || "";
    const catFromUrl = searchParams?.get("category") || "All";
    setSearchInput(qFromUrl);
    setActiveQuery(qFromUrl);
    if (catFromUrl !== "All") {
      setSelectedCategory(catFromUrl);
    }
  }, [searchParams]);

  // Execute Search
  const handlePerformSearch = (newQuery: string) => {
    setSuggestionsOpen(false);
    const clean = newQuery.trim();
    setActiveQuery(clean);
    setSearchInput(clean);

    // Update browser URL cleanly
    const params = new URLSearchParams();
    if (clean) params.set("q", clean);
    if (selectedCategory !== "All") params.set("category", selectedCategory);
    router.push(`/search?${params.toString()}`);
  };

  // 100% Case-Insensitive Product Filtering
  const filteredProducts = useMemo(() => {
    let prods = [...allProducts];
    const q = activeQuery.trim().toLowerCase();

    // Query match
    if (q) {
      const searchWords = q.split(/\s+/).filter(Boolean);

      prods = prods.filter((p) => {
        const nameLower = (p.name || "").toLowerCase();
        const catLower = (p.category || "").toLowerCase();
        const authorLower = (p.author || "").toLowerCase();
        const descLower = (p.description || "").toLowerCase();
        const skuLower = (p.sku || "").toLowerCase();
        const tagsLower = (p.tags || []).map((t) => t.toLowerCase());

        // Every search word should match in at least one field (fuzzy multi-word)
        return searchWords.every((word) => {
          return (
            nameLower.includes(word) ||
            catLower.includes(word) ||
            authorLower.includes(word) ||
            descLower.includes(word) ||
            skuLower.includes(word) ||
            tagsLower.some((t) => t.includes(word))
          );
        });
      });
    }

    // Category filter (case-insensitive)
    if (selectedCategory !== "All") {
      const catLower = selectedCategory.toLowerCase();
      prods = prods.filter((p) => (p.category || "").toLowerCase() === catLower);
    }

    // Price range filter
    if (priceFilter !== "all") {
      prods = prods.filter((p) => {
        switch (priceFilter) {
          case "under-10k":
            return p.price < 10000;
          case "10k-50k":
            return p.price >= 10000 && p.price <= 50000;
          case "50k-200k":
            return p.price > 50000 && p.price <= 200000;
          case "above-200k":
            return p.price > 200000;
          default:
            return true;
        }
      });
    }

    // In Stock filter
    if (onlyInStock) {
      prods = prods.filter((p) => p.inStock !== false);
    }

    // Sorting
    prods.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating":
          return (b.rating || 5) - (a.rating || 5);
        case "newest": {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        case "relevance":
        default: {
          // Weight name matches higher than description
          if (!q) return (b.reviewsCount || 0) - (a.reviewsCount || 0);
          const aName = a.name.toLowerCase().includes(q) ? 2 : 0;
          const bName = b.name.toLowerCase().includes(q) ? 2 : 0;
          return bName - aName;
        }
      }
    });

    return prods;
  }, [allProducts, activeQuery, selectedCategory, priceFilter, onlyInStock, sortBy]);

  // Matching Store detection (case-insensitive)
  const matchingStore = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    if (!q || q.length < 2) return null;
    return (
      allStores.find(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q))
      ) || null
    );
  }, [allStores, activeQuery]);

  // Dynamic Categories from the searched products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    allCategories.forEach((c) => {
      if (c && c !== "All") cats.add(c);
    });
    return Array.from(cats);
  }, [allCategories]);

  // Add to cart toast helper
  const handleAddToCart = (item: Pick<Product, "id" | "name">, qty = 1) => {
    addToCart(item.id, qty);
    setToast(`Added "${item.name}" to cart!`);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSignOut = () => {
    SignOut();
    router.push("/");
  };

  return (
    <div className={styles.searchPage}>
      {/* Global Header */}
      <HomeHeader
        search={searchInput}
        onSearchChange={(val) => {
          setSearchInput(val);
          setSuggestionsOpen(true);
        }}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        hasStore={hasStore}
        onCreateStore={() => router.push("/account/create-store")}
        manageStore={() => router.push("/account/manage-store")}
        onSignOut={handleSignOut}
        onSignIn={() => router.push("/login")}
      />

      <div className={styles.searchContentArea}>
        {/* Search Hero Box */}
        <section className={styles.searchHero}>
          <div className={styles.searchHeroTop}>
            <h1 className={styles.searchHeroTitle}>
              {activeQuery ? `Results for “${activeQuery}”` : "Search Sellora Marketplace"}
            </h1>
            <p className={styles.searchHeroDesc}>
              {filteredProducts.length > 0 ? (
                <>
                  Found{" "}
                  <span className={styles.searchHeroDescStrong}>
                    {filteredProducts.length}
                  </span>{" "}
                  matching product{filteredProducts.length !== 1 ? "s" : ""} from verified Nigerian
                  merchants.
                </>
              ) : (
                "Discover authentic products, verified stores, and best prices across Nigeria."
              )}
            </p>
          </div>

          {/* Interactive Search Input with Live Suggestions */}
          <div ref={searchFormRef} className={styles.searchBoxWrap}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformSearch(searchInput);
              }}
              className={styles.searchBoxForm}
            >
              <span className="material-icons-round" style={{ color: "#2563eb", fontSize: "22px" }}>
                search
              </span>
              <input
                type="text"
                className={styles.searchBoxInput}
                placeholder="Search products, brands, verified stores, categories…"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                autoComplete="off"
              />
              {searchInput && (
                <button
                  type="button"
                  className={styles.searchBoxClearBtn}
                  onClick={() => {
                    setSearchInput("");
                    setActiveQuery("");
                    router.push("/search");
                  }}
                  title="Clear search query"
                >
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    close
                  </span>
                </button>
              )}
              <button type="submit" className={styles.searchBoxSubmitBtn}>
                <span className="material-icons-round" style={{ fontSize: "18px" }}>
                  search
                </span>
                <span>Search</span>
              </button>
            </form>

            {/* Floating Suggestions Dropdown while typing */}
            <SearchSuggestionsDropdown
              query={searchInput}
              isOpen={suggestionsOpen}
              onSelectTerm={(term) => handlePerformSearch(term)}
              onClose={() => setSuggestionsOpen(false)}
            />
          </div>

          {/* Matching Merchant Store Card (if a store matches query) */}
          {matchingStore && (
            <div className={styles.matchingStoreBanner}>
              <div className={styles.matchingStoreLeft}>
                {matchingStore.logo ? (
                  <img
                    src={matchingStore.logo}
                    alt={matchingStore.name}
                    className={styles.matchingStoreLogo}
                  />
                ) : (
                  <div className={styles.matchingStoreMonogram}>
                    {(matchingStore.name || "S")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className={styles.matchingStoreNameRow}>
                    <span className={styles.matchingStoreName}>{matchingStore.name}</span>
                    {matchingStore.isVerified && (
                      <span
                        className="material-icons-round"
                        style={{ color: "#10b981", fontSize: "18px" }}
                        title="Verified Merchant"
                      >
                        verified
                      </span>
                    )}
                  </div>
                  <p className={styles.matchingStoreBio}>
                    {matchingStore.description ||
                      `Official merchant storefront • ${matchingStore.location || "Nigeria"}`}
                  </p>
                </div>
              </div>
              <Link href={getStoreRelativePath(matchingStore)} className={styles.matchingStoreBtn}>
                <span>Visit Store</span>
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  storefront
                </span>
              </Link>
            </div>
          )}
        </section>

        {/* Toolbar & Filter Pills */}
        <div className={styles.searchToolbar}>
          {/* Category Pills */}
          <div className={styles.searchToolbarLeft}>
            {availableCategories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.searchFilterPill} ${
                  selectedCategory === cat ? styles.searchFilterPillActive : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Filters (Sort, Price, In-Stock) */}
          <div className={styles.searchToolbarRight}>
            <select
              className={styles.sortSelect}
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
              aria-label="Filter by price range"
            >
              <option value="all">All Prices</option>
              <option value="under-10k">Under ₦10,000</option>
              <option value="10k-50k">₦10,000 – ₦50,000</option>
              <option value="50k-200k">₦50,000 – ₦200,000</option>
              <option value="above-200k">Above ₦200,000</option>
            </select>

            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort search results"
            >
              <option value="relevance">Most Relevant</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
            </select>

            <label className={styles.inStockToggle}>
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </div>

        {/* Product Results Grid or Empty State */}
        {filteredProducts.length > 0 ? (
          <div className={styles.resultsGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(p) => handleAddToCart(p, 1)}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            <span className={`material-icons-round ${styles.emptyStateIcon}`}>
              search_off
            </span>
            <h2 className={styles.emptyStateTitle}>No Products Found</h2>
            <p className={styles.emptyStateDesc}>
              We couldn&rsquo;t find any products matching &ldquo;
              <strong>{activeQuery || selectedCategory}</strong>&rdquo;. Please check your spelling,
              try broader keywords, or explore one of the trending categories below.
            </p>

            <div className={styles.emptyTrendingSection}>
              <div className={styles.emptyTrendingTitle}>Suggested Searches</div>
              <div className={styles.categoryPillList} style={{ justifyContent: "center" }}>
                {["iPhone", "Sneakers", "Smart Watch", "Handbags", "Laptop", "Shoes"].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      className={styles.categoryPillBtn}
                      onClick={() => handlePerformSearch(term)}
                    >
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "14px", color: "#2563eb" }}
                      >
                        trending_up
                      </span>
                      <span>{term}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              className={styles.emptyResetBtn}
              onClick={() => {
                setActiveQuery("");
                setSearchInput("");
                setSelectedCategory("All");
                setPriceFilter("all");
                setOnlyInStock(false);
                router.push("/search");
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                refresh
              </span>
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13.5px",
            fontWeight: 600,
          }}
        >
          <span className="material-icons-round" style={{ color: "#10b981", fontSize: "18px" }}>
            check_circle
          </span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
