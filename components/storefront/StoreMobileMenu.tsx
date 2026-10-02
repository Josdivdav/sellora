"use client";

import Link from "next/link";
import styles from "./storefront.module.css";
import type { Store } from "@/types/store";

interface StoreMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  activeTab: "products" | "about" | "policies";
  onTabChange: (tab: "products" | "about" | "policies") => void;
  availableCategories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onShare?: () => void;
}

export default function StoreMobileMenu({
  isOpen,
  onClose,
  store,
  activeTab,
  onTabChange,
  availableCategories,
  selectedCategory,
  onSelectCategory,
  onShare,
}: StoreMobileMenuProps) {
  if (!isOpen) return null;

  const cleanPhone = (store.whatsapp || store.phone || store.whatsappPhone || "08038737198").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? `234${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    `Hello ${store.name}! I am browsing your official store and have an inquiry.`
  )}`;

  return (
    <div className={styles.mobileDrawerOverlay} onClick={onClose}>
      <div
        className={styles.mobileDrawerContent}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className={styles.mobileDrawerHeader}>
          <div className={styles.mobileDrawerBrand}>
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className={styles.mobileDrawerLogo}
              />
            ) : (
              <div className={styles.mobileDrawerMonogram}>
                {(store.name || "S")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className={styles.mobileDrawerTitleRow}>
                <span className={styles.mobileDrawerName}>{store.name}</span>
                {store.isVerified && (
                  <span className={`material-icons-round ${styles.mobileDrawerVerified}`}>
                    verified
                  </span>
                )}
              </div>
              <span className={styles.mobileDrawerSub}>
                {store.category || "Official Store"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={styles.mobileDrawerCloseBtn}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>

        {/* WhatsApp Quick Action */}
        <div className={styles.mobileDrawerCtaSection}>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileDrawerWhatsappBtn}
          >
            <span className="material-icons-round" style={{ fontSize: "18px" }}>
              chat
            </span>
            <span>Chat Directly on WhatsApp</span>
          </a>
        </div>

        {/* Navigation Items */}
        <div className={styles.mobileDrawerBody}>
          <div className={styles.mobileDrawerSectionTitle}>Store Navigation</div>

          <button
            type="button"
            className={`${styles.mobileDrawerItem} ${
              activeTab === "products" && selectedCategory === "All"
                ? styles.mobileDrawerItemActive
                : ""
            }`}
            onClick={() => {
              onTabChange("products");
              onSelectCategory("All");
              onClose();
            }}
          >
            <span className="material-icons-round">storefront</span>
            <span>All Products</span>
          </button>

          {availableCategories.length > 1 && (
            <div className={styles.mobileDrawerCatGroup}>
              <div className={styles.mobileDrawerSubTitle}>Categories</div>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.mobileDrawerSubItem} ${
                    activeTab === "products" && selectedCategory === cat
                      ? styles.mobileDrawerSubItemActive
                      : ""
                  }`}
                  onClick={() => {
                    onTabChange("products");
                    onSelectCategory(cat);
                    onClose();
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    chevron_right
                  </span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className={`${styles.mobileDrawerItem} ${
              activeTab === "about" ? styles.mobileDrawerItemActive : ""
            }`}
            onClick={() => {
              onTabChange("about");
              onClose();
            }}
          >
            <span className="material-icons-round">info</span>
            <span>About Merchant</span>
          </button>

          <button
            type="button"
            className={`${styles.mobileDrawerItem} ${
              activeTab === "policies" ? styles.mobileDrawerItemActive : ""
            }`}
            onClick={() => {
              onTabChange("policies");
              onClose();
            }}
          >
            <span className="material-icons-round">verified_user</span>
            <span>Shipping & Policies</span>
          </button>

          {onShare && (
            <button
              type="button"
              className={styles.mobileDrawerItem}
              onClick={() => {
                onShare();
                onClose();
              }}
            >
              <span className="material-icons-round">share</span>
              <span>Share Store Link</span>
            </button>
          )}
        </div>

        {/* Drawer Footer with Powered By */}
        <div className={styles.mobileDrawerFooter}>
          <div className={styles.mobileDrawerLocation}>
            <span className="material-icons-round" style={{ fontSize: "16px", color: "#64748b" }}>
              location_on
            </span>
            <span>{store.location || "Nigeria"}</span>
          </div>

          <div className={styles.mobileDrawerPoweredBy}>
            <span>Powered by</span>
            <Link href="https://devico.online" target="_blank" className={styles.mobileDrawerPoweredLink}>
              Sellora
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
