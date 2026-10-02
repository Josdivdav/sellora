"use client";

import Link from "next/link";
import styles from "./storefront.module.css";
import type { Store } from "@/types/store";
import { getStoreSlug } from "@/lib/storeUrl";

interface StoreHeaderProps {
  store: Store;
  isSubdomain: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  onCartClick: () => void;
  activeTab: "products" | "about" | "policies";
  onTabChange: (tab: "products" | "about" | "policies") => void;
  onOpenMobileMenu: () => void;
  availableCategories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onShare?: () => void;
  isOwner?: boolean;
}

export default function StoreHeader({
  store,
  isSubdomain,
  searchQuery,
  onSearchChange,
  cartCount,
  onCartClick,
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  availableCategories,
  selectedCategory,
  onSelectCategory,
  isFollowing,
  onToggleFollow,
  onShare,
  isOwner,
}: StoreHeaderProps) {
  const storeSlug = getStoreSlug(store);
  const homeHref = isSubdomain ? "/" : `/${storeSlug}`;

  // WhatsApp link for instant contact
  const cleanPhone = (store.whatsapp || store.phone || store.whatsappPhone || "08038737198").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? `234${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    `Hello ${store.name}! I am browsing your official online store and have an inquiry.`
  )}`;

  return (
    <header className={styles.standaloneHeader}>
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className={styles.announcementBar}>
        <div className={styles.announcementContainer}>
          <div className={styles.announcementLeft}>
            {!isSubdomain ? (
              <Link href="/" className={styles.marketplaceReturnLink}>
                <span className="material-icons-round" style={{ fontSize: "14px" }}>
                  arrow_back
                </span>
                <span>Sellora Marketplace</span>
              </Link>
            ) : (
              <span className={styles.standaloneStoreBadge}>
                <span className="material-icons-round" style={{ fontSize: "14px", color: "#10b981" }}>
                  verified
                </span>
                <span>Official Online Store</span>
              </span>
            )}
          </div>

          <div className={styles.announcementCenter}>
            <span className={styles.announcementPulseDot} />
            <span>
              ⚡ Direct Storefront • Fast Nationwide Delivery • Direct Bank Payout
            </span>
          </div>

          <div className={styles.announcementRight}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.announcementHelpLink}
            >
              <span className="material-icons-round" style={{ fontSize: "14px", color: "#10b981" }}>
                chat
              </span>
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND & SEARCH ROW */}
      <div className={styles.headerMainRow}>
        <div className={styles.headerMainContainer}>
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={onOpenMobileMenu}
            aria-label="Open store navigation menu"
          >
            <span className="material-icons-round">menu</span>
          </button>

          {/* STORE BRAND LOGO & TITLE */}
          <Link href={homeHref} className={styles.storeBrandLink}>
            {store.logo ? (
              <img
                src={store.logo}
                alt={`${store.name} logo`}
                className={styles.storeBrandLogo}
              />
            ) : (
              <div className={styles.storeBrandMonogram}>
                {(store.name || "S")[0].toUpperCase()}
              </div>
            )}
            <div className={styles.storeBrandInfo}>
              <div className={styles.storeBrandTitleRow}>
                <span className={styles.storeBrandTitle}>{store.name}</span>
                {store.isVerified ? (
                  <span
                    className={`material-icons-round ${styles.storeBrandVerified}`}
                    title="Verified Merchant"
                  >
                    verified
                  </span>
                ) : (
                  <span
                    className={styles.storeBrandUnverified}
                    title="This store is not verified"
                  >
                    unverified
                  </span>
                )}
              </div>
              <span className={styles.storeBrandSub}>
                {store.category || "Official Storefront"}
              </span>
            </div>
          </Link>

          {/* IN-STORE DEDICATED SEARCH BAR */}
          <div className={styles.headerSearchWrap}>
            <span className={`material-icons-round ${styles.headerSearchIcon}`}>
              search
            </span>
            <input
              type="text"
              className={styles.headerSearchInput}
              placeholder={`Search products in ${store.name}...`}
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeTab !== "products") {
                  onTabChange("products");
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.headerSearchClearBtn}
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  close
                </span>
              </button>
            )}
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className={styles.headerActions}>
            {/* WhatsApp Contact CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.headerWhatsappBtn}
              title="Chat with store merchant on WhatsApp"
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                chat
              </span>
              <span className={styles.headerWhatsappText}>WhatsApp Us</span>
            </a>

            {/* Share Store */}
            {onShare && (
              <button
                type="button"
                className={styles.headerIconBtn}
                onClick={onShare}
                title="Share this store"
              >
                <span className="material-icons-round" style={{ fontSize: "20px" }}>
                  share
                </span>
              </button>
            )}

            {/* Follow Store */}
            {onToggleFollow && !isOwner && (
              <button
                type="button"
                className={`${styles.headerIconBtn} ${
                  isFollowing ? styles.headerIconBtnActive : ""
                }`}
                onClick={onToggleFollow}
                title={isFollowing ? "Unfollow store" : "Follow store"}
              >
                <span className="material-icons-round" style={{ fontSize: "20px" }}>
                  {isFollowing ? "favorite" : "favorite_border"}
                </span>
              </button>
            )}

            {/* Shopping Bag / Cart */}
            <button
              type="button"
              className={styles.headerCartBtn}
              onClick={onCartClick}
              aria-label={`Shopping bag with ${cartCount} items`}
            >
              <span className="material-icons-round" style={{ fontSize: "21px" }}>
                shopping_bag
              </span>
              <span className={styles.headerCartLabel}>Bag</span>
              {cartCount > 0 && (
                <span className={styles.headerCartBadge}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. STORE NAVIGATION MENU BAR */}
      <nav className={styles.storeNavBar} aria-label="Store navigation">
        <div className={styles.storeNavContainer}>
          <div className={styles.storeNavLinks}>
            <button
              type="button"
              className={`${styles.storeNavLink} ${
                activeTab === "products" && selectedCategory === "All"
                  ? styles.storeNavLinkActive
                  : ""
              }`}
              onClick={() => {
                onTabChange("products");
                onSelectCategory("All");
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                storefront
              </span>
              <span>All Products</span>
            </button>

            {/* Dynamic Store Categories */}
            {availableCategories
              .filter((c) => c !== "All")
              .slice(0, 5)
              .map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.storeNavLink} ${
                    activeTab === "products" && selectedCategory === cat
                      ? styles.storeNavLinkActive
                      : ""
                  }`}
                  onClick={() => {
                    onTabChange("products");
                    onSelectCategory(cat);
                  }}
                >
                  <span>{cat}</span>
                </button>
              ))}

            <button
              type="button"
              className={`${styles.storeNavLink} ${
                activeTab === "about" ? styles.storeNavLinkActive : ""
              }`}
              onClick={() => onTabChange("about")}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                info
              </span>
              <span>About Us</span>
            </button>

            <button
              type="button"
              className={`${styles.storeNavLink} ${
                activeTab === "policies" ? styles.storeNavLinkActive : ""
              }`}
              onClick={() => onTabChange("policies")}
            >
              <span className="material-icons-round" style={{ fontSize: "16px" }}>
                verified_user
              </span>
              <span>Shipping & Policies</span>
            </button>
          </div>

          <div className={styles.storeNavRight}>
            <span className={styles.storeLocationPill}>
              <span className="material-icons-round" style={{ fontSize: "14px", color: "#64748b" }}>
                location_on
              </span>
              <span>{store.location || "Nigeria"}</span>
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}
