"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./storefront.module.css";
import type { Store } from "@/types/store";
import type { Product } from "@/types/product";
import { useAuth } from "@/context/AuthContext";
import StoreHeader from "./StoreHeader";
import StoreFooter from "./StoreFooter";
import StoreMobileMenu from "./StoreMobileMenu";
import ProductCard from "@/components/home/ProductCard";
import { getStoreFullUrl, getStoreSlug } from "@/lib/storeUrl";
import { toggleStoreFollow } from "@/lib/followStore";
import { useCart } from "@/context/CartContext";
import { useChat } from "@/context/ChatContext";

interface StoreFrontClientProps {
  initialStore: Store;
  initialProducts: Product[];
  storeSlug: string;
  isSubdomain?: boolean;
  initialTab?: StoreTab;
}

type StoreTab = "products" | "about" | "policies";
type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "newest";

export default function StoreFrontClient({
  initialStore,
  initialProducts,
  storeSlug,
  isSubdomain = false,
  initialTab = "products",
}: StoreFrontClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openChat } = useChat();

  // Navigation & Drawer states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount, addToCart } = useCart();

  // Store tab & filter states
  const [activeTab, setActiveTab] = useState<StoreTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  // Following & interactive states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(initialStore.followersCount || 0);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [isOwnerFromApi, setIsOwnerFromApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch live follow status and follower count directly from database
  useEffect(() => {
    let isMounted = true;

    async function fetchFollowStatus() {
      try {
        const token = user ? await user.getIdToken() : null;
        const res = await fetch(
          `/api/stores/${encodeURIComponent(initialStore.slug || initialStore.id)}/follow`,
          {
            headers: token ? { authorization: `Bearer ${token}` } : {},
          }
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.isOwner) {
            setIsOwnerFromApi(true);
          }
          if (typeof json.followersCount === "number") {
            setFollowersCount(json.followersCount);
          }
          if (typeof json.isFollowing === "boolean") {
            setIsFollowing(json.isFollowing);
          }
        }
      } catch {
        // Fallback
      }
    }

    fetchFollowStatus();

    const handleFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (
        detail &&
        (detail.storeSlug === initialStore.slug || detail.storeId === initialStore.id)
      ) {
        if (typeof detail.isFollowing === "boolean") setIsFollowing(detail.isFollowing);
        if (typeof detail.followersCount === "number") setFollowersCount(detail.followersCount);
      }
    };

    window.addEventListener("sellora_store_follow_changed", handleFollowChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("sellora_store_follow_changed", handleFollowChanged);
    };
  }, [user, initialStore.slug, initialStore.id]);

  // Check if current user is the owner of this storefront
  const isOwner = useMemo(() => {
    if (isOwnerFromApi) return true;
    if (!user || !initialStore) return false;
    return (
      user.uid === initialStore.id ||
      (initialStore as any).userId === user.uid ||
      (initialStore as any).ownerId === user.uid ||
      (initialStore as any).authorId === user.uid
    );
  }, [user, initialStore, isOwnerFromApi]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Follow / Unfollow Store directly against database
  const handleToggleFollow = async () => {
    // 1. Guard: Check if logged in
    if (!user) {
      showToast("Please sign in to follow this store.");
      router.push("/login");
      return;
    }

    // 2. Guard: Check if owner
    if (isOwner) {
      showToast("You cannot follow your own store.");
      return;
    }

    if (isFollowSubmitting) return;
    setIsFollowSubmitting(true);

    try {
      const token = await user.getIdToken();
      const res = await toggleStoreFollow({
        storeSlug: initialStore.slug || initialStore.id,
        storeId: initialStore.id,
        storeName: initialStore.name,
        token,
        isLoggedIn: true,
        isOwner: isOwner,
      });

      if (!res.success) {
        showToast(res.message || "Failed to update follow status.");
      } else {
        if (typeof res.isFollowing === "boolean") setIsFollowing(res.isFollowing);
        if (typeof res.followersCount === "number") setFollowersCount(res.followersCount);
        showToast(
          res.message ||
            (res.isFollowing
              ? `Following ${initialStore.name}!`
              : `Unfollowed ${initialStore.name}.`)
        );
      }
    } catch {
      showToast("An error occurred while updating follow status.");
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  // Share Storefront Link
  const handleShare = () => {
    const fullUrl = getStoreFullUrl(initialStore);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      showToast(`Copied store link: ${fullUrl}`);
    } else {
      showToast(`Store URL: ${fullUrl}`);
    }
  };

  // In-app chat with merchant
  const handleInAppChat = () => {
    openChat({
      storeId: initialStore.id || initialStore.ownerId || initialStore.slug || "official",
      storeName: initialStore.name,
      storeSlug: storeSlugFormatted,
    });
  };

  // Contact Merchant directly via WhatsApp
  const handleContactMerchant = () => {
    const cleanPhone = (initialStore.whatsapp || initialStore.phone || initialStore.whatsappPhone || "08038737198").replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `234${cleanPhone.slice(1)}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
      `Hello ${initialStore.name}! I am browsing your official store and have an inquiry.`
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // Add to cart
  const handleAddToCart = (product: Pick<Product, "id" | "name">) => {
    addToCart(product.id, 1);
    showToast(`Added "${product.name}" to cart`);
  };

  // Dynamic Categories from store's actual products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    cats.add("All");
    initialProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [initialProducts]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    let prods = [...initialProducts];

    // Filter by search (case-insensitive multi-word match)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      prods = prods.filter((p) =>
        words.every(
          (w) =>
            p.name.toLowerCase().includes(w) ||
            p.category.toLowerCase().includes(w) ||
            (p.sku && p.sku.toLowerCase().includes(w)) ||
            (p.description && p.description.toLowerCase().includes(w)) ||
            p.tags?.some((t) => t.toLowerCase().includes(w))
        )
      );
    }

    // Filter by category
    if (selectedCategory !== "All") {
      prods = prods.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort
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
        case "featured":
        default:
          return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      }
    });

    return prods;
  }, [initialProducts, searchQuery, selectedCategory, sortBy]);

  const storeSlugFormatted = getStoreSlug(initialStore);

  return (
    <div className={styles.page}>
      <StoreHeader
        store={initialStore}
        isSubdomain={isSubdomain}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        onCartClick={() => router.push("/cart")}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        availableCategories={availableCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        isFollowing={isFollowing}
        onToggleFollow={handleToggleFollow}
        onShare={handleShare}
        isOwner={isOwner}
      />

      <StoreMobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        store={initialStore}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        availableCategories={availableCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onShare={handleShare}
      />

      <div className={styles.contentArea}>
        <main className={styles.main}>
          {/* Owner Notice Banner if viewing your own store */}
          {isOwner && (
            <div className={styles.ownerNoticeBanner}>
              <div className={styles.ownerNoticeLeft}>
                <span className="material-icons-round">visibility</span>
                <span>
                  You are previewing your live merchant storefront as buyers see it.
                </span>
              </div>
              <Link href="/account/manage-store" className={styles.ownerNoticeBtn}>
                <span className="material-icons-round" style={{ fontSize: "15px" }}>
                  dashboard
                </span>
                Manage Store & Products
              </Link>
            </div>
          )}

          {/* Storefront Hero Card */}
          <section className={styles.storeHeroCard}>
            <div className={styles.heroBannerWrap}>
              {initialStore.banner ? (
                <img
                  src={initialStore.banner}
                  alt={`${initialStore.name} cover`}
                  className={styles.heroBannerImg}
                />
              ) : null}
              <div className={styles.heroBannerGradient} />

              {initialStore.badge && (
                <div className={styles.heroBadge}>
                  <span className="material-icons-round" style={{ fontSize: "14px" }}>
                    stars
                  </span>
                  <span>{initialStore.badge}</span>
                </div>
              )}

              <div className={styles.heroSubdomainTag}>
                <span className="material-icons-round" style={{ fontSize: "14px", color: initialStore.isPremium ? "#10b981" : "#2b6dff" }}>
                  {initialStore.isPremium ? "verified" : "link"}
                </span>
                <span>
                  {initialStore.isPremium
                    ? `${storeSlugFormatted}.devico.online`
                    : `devico.online/${storeSlugFormatted}`}
                </span>
              </div>
            </div>

            <div className={styles.storeIdentityWrap}>
              <div className={styles.storeHeaderFlex}>
                <div className={styles.storeAvatarTitleRow}>
                  {initialStore.logo ? (
                    <img
                      src={initialStore.logo}
                      alt={initialStore.name}
                      className={styles.storeAvatar}
                    />
                  ) : (
                    <div className={styles.storeAvatarFallback}>
                      {(initialStore.name || "S")[0].toUpperCase()}
                    </div>
                  )}

                  <div className={styles.storeTitles}>
                    <div className={styles.storeNameRow}>
                      <h1 className={styles.storeName}>{initialStore.name}</h1>
                      {initialStore.isVerified ? (
                        <span
                          className={`material-icons-round ${styles.verifiedCheck}`}
                          title="Verified Merchant"
                        >
                          verified
                        </span>
                      ) : (
                        <span
                          className={styles.unverifiedCheckBadge}
                          title="This store is not verified"
                        >
                          <span className="material-icons-round" style={{ fontSize: "14px" }}>warning</span>
                          This store is not verified
                        </span>
                      )}
                    </div>
                    <span className={styles.storeHandle}>
                      @{storeSlugFormatted}
                    </span>
                    <span className={styles.storeCategoryBadge}>
                      {initialStore.category}
                    </span>
                  </div>
                </div>

                <div className={styles.storeActionButtons}>
                  {isOwner ? (
                    <div
                      className={styles.followBtn}
                      style={{
                        background: "#f1f5f9",
                        borderColor: "#cbd5e1",
                        color: "#475569",
                        cursor: "default",
                      }}
                      title="You own this store"
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
                        store
                      </span>
                      <span>Your Storefront</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.followBtn} ${
                        isFollowing ? styles.followBtnActive : ""
                      }`}
                      onClick={handleToggleFollow}
                      disabled={isFollowSubmitting}
                      title={!user ? "Sign in to follow" : isFollowing ? "Click to unfollow" : "Click to follow"}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>
                        {isFollowing ? "favorite" : "favorite_border"}
                      </span>
                      <span>
                        {isFollowSubmitting
                          ? "Updating..."
                          : isFollowing
                          ? "Following"
                          : "Follow Store"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.shareBtn}
                    onClick={handleShare}
                    title="Copy store share link"
                  >
                    <span className="material-icons-round" style={{ fontSize: "16px" }}>
                      share
                    </span>
                    <span>Share</span>
                  </button>

                  {!isOwner && (
                    <button
                      type="button"
                      className={styles.contactBtn}
                      onClick={handleInAppChat}
                      title="Chat with merchant on Sellora"
                      style={{
                        background: "#eff6ff",
                        borderColor: "#bfdbfe",
                        color: "#2b6dff",
                        fontWeight: 600,
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>
                        chat
                      </span>
                      <span>Chat</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.contactBtn}
                    onClick={handleContactMerchant}
                    title="Contact store representative on WhatsApp"
                  >
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#10b981" }}>
                      forum
                    </span>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {initialStore.description && (
                <p className={styles.storeBio}>{initialStore.description}</p>
              )}

              {/* Trust & Metrics Row */}
              <div className={styles.trustMetricsRow}>
                <div className={styles.metricItem}>
                  <span className={`material-icons-round ${styles.metricStar}`}>
                    star
                  </span>
                  <span className={styles.metricItemStrong}>
                    {Number(initialStore.rating || 5).toFixed(1)}
                  </span>
                  <span>({initialStore.reviewsCount || 0} reviews)</span>
                </div>

                <span className={styles.metricDotSep}>•</span>

                <div className={styles.metricItem}>
                  <span className={`material-icons-round ${styles.metricIcon}`}>
                    group
                  </span>
                  <span className={styles.metricItemStrong}>
                    {followersCount.toLocaleString()}
                  </span>
                  <span>Followers</span>
                </div>

                <span className={styles.metricDotSep}>•</span>

                <div className={styles.metricItem}>
                  <span className={`material-icons-round ${styles.metricIcon}`}>
                    bolt
                  </span>
                  <span>{initialStore.deliverySpeed || "Fast dispatch"}</span>
                </div>

                <span className={styles.metricDotSep}>•</span>

                <div className={styles.metricItem}>
                  <span className={`material-icons-round ${styles.metricIcon}`}>
                    place
                  </span>
                  <span>{initialStore.location || "Nigeria"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Unverified Store Warning Notice for Buyers */}
          {!initialStore.isVerified && (
            <div className={styles.unverifiedStoreBanner}>
              <div className={styles.unverifiedBannerLeft}>
                <span className="material-icons-round" style={{ fontSize: "24px", color: "#d97706" }}>
                  gpp_maybe
                </span>
                <div>
                  <div className={styles.unverifiedBannerTitle}>
                    This store is not verified
                  </div>
                  <p className={styles.unverifiedBannerDesc}>
                    This merchant has not completed official identity and business verification with Sellora. Please verify products, contact info, and payment terms carefully before completing transactions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Store Tabs */}
          <div className={styles.storeTabsRow}>
            <button
              type="button"
              className={`${styles.storeTabBtn} ${
                activeTab === "products" ? styles.storeTabBtnActive : ""
              }`}
              onClick={() => setActiveTab("products")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                inventory_2
              </span>
              <span>Products</span>
              <span className={styles.tabCountBadge}>
                {initialProducts.length}
              </span>
            </button>

            <button
              type="button"
              className={`${styles.storeTabBtn} ${
                activeTab === "about" ? styles.storeTabBtnActive : ""
              }`}
              onClick={() => setActiveTab("about")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                info
              </span>
              <span>About Merchant</span>
            </button>

            <button
              type="button"
              className={`${styles.storeTabBtn} ${
                activeTab === "policies" ? styles.storeTabBtnActive : ""
              }`}
              onClick={() => setActiveTab("policies")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                verified_user
              </span>
              <span>Policies & Dispatch</span>
            </button>
          </div>

          {/* TAB 1: Products Tab */}
          {activeTab === "products" && (
            <>
              {/* In-store Toolbar */}
              <div className={styles.storeToolbar}>
                <div className={styles.searchWrap}>
                  <span className="material-icons-round" style={{ color: "#94a3b8", fontSize: "18px" }}>
                    search
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={`Search in ${initialStore.name}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
                    >
                      <span className="material-icons-round" style={{ fontSize: "16px" }}>
                        close
                      </span>
                    </button>
                  )}
                </div>

                <div className={styles.toolbarRight}>
                  {availableCategories.length > 2 && (
                    <div className={styles.categoryPillGroup}>
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`${styles.categoryPill} ${
                            selectedCategory === cat ? styles.categoryPillActive : ""
                          }`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort products"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>
                </div>
              </div>

              {/* Products Grid or Empty State */}
              {filteredProducts.length > 0 ? (
                <div className={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateBox}>
                  <span className="material-icons-round" style={{ fontSize: "48px", color: "#94a3b8" }}>
                    search_off
                  </span>
                  <h3 className={styles.emptyStateTitle}>No Products Found</h3>
                  <p className={styles.emptyStateDesc}>
                    {searchQuery || selectedCategory !== "All"
                      ? `No products in ${initialStore.name} match "${searchQuery || selectedCategory}".`
                      : "This merchant hasn't published any items yet."}
                  </p>
                  {(searchQuery || selectedCategory !== "All") && (
                    <button
                      type="button"
                      className={styles.resetFiltersBtn}
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                      }}
                    >
                      Clear Store Filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: About Tab */}
          {activeTab === "about" && (
            <div className={styles.aboutCard}>
              <div className={styles.aboutGrid}>
                <div className={styles.aboutBlock}>
                  <h4 className={styles.aboutBlockTitle}>
                    <span className="material-icons-round" style={{ color: "#2b6dff" }}>
                      storefront
                    </span>
                    Merchant Profile
                  </h4>
                  <p className={styles.aboutBlockContent}>
                    {initialStore.description ||
                      `${initialStore.name} is a verified seller providing direct-to-consumer goods on the Sellora marketplace.`}
                  </p>
                  {initialStore.tags && initialStore.tags.length > 0 && (
                    <div className={styles.tagList}>
                      {initialStore.tags.map((tag) => (
                        <span key={tag} className={styles.tagChip}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.aboutBlock}>
                  <h4 className={styles.aboutBlockTitle}>
                    <span className="material-icons-round" style={{ color: "#10b981" }}>
                      verified
                    </span>
                    Store Verification & Reliability
                  </h4>
                  <p className={styles.aboutBlockContent}>
                    Member Since: <strong>{initialStore.joinedDate || "2023"}</strong>
                    <br />
                    Location: <strong>{initialStore.location || "Lagos, Nigeria"}</strong>
                    <br />
                    Response Rate: <strong>{initialStore.responseRate || "100%"}</strong>
                    <br />
                    Customer Rating: <strong>★ {Number(initialStore.rating || 5).toFixed(1)} / 5.0</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Policies Tab */}
          {activeTab === "policies" && (
            <div className={styles.aboutCard}>
              <div className={styles.aboutGrid}>
                <div className={styles.aboutBlock}>
                  <h4 className={styles.aboutBlockTitle}>
                    <span className="material-icons-round" style={{ color: "#2b6dff" }}>
                      local_shipping
                    </span>
                    Shipping & Delivery
                  </h4>
                  <p className={styles.aboutBlockContent}>
                    Standard dispatch: <strong>{initialStore.deliverySpeed || "Within 24-48 hours"}</strong>.
                    All orders are tracked end-to-end with real-time status updates delivered straight to your account.
                  </p>
                </div>

                <div className={styles.aboutBlock}>
                  <h4 className={styles.aboutBlockTitle}>
                    <span className="material-icons-round" style={{ color: "#6366f1" }}>
                      published_with_changes
                    </span>
                    7-Day Buyer Protection
                  </h4>
                  <p className={styles.aboutBlockContent}>
                    All items sold by {initialStore.name} are eligible for 7-day hassle-free returns if defective or significantly not as described.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Standalone Store Footer */}
      <StoreFooter
        store={initialStore}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Floating Toast */}
      {toastMessage && (
        <div className={styles.toast}>
          <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>
            info
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
