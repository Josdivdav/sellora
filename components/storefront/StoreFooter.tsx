"use client";

import Link from "next/link";
import styles from "./storefront.module.css";
import type { Store } from "@/types/store";

interface StoreFooterProps {
  store: Store;
  onTabChange?: (tab: "products" | "about" | "policies") => void;
}

export default function StoreFooter({ store, onTabChange }: StoreFooterProps) {
  const currentYear = new Date().getFullYear();
  const cleanPhone = (store.whatsapp || store.phone || store.whatsappPhone || "08038737198").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? `234${cleanPhone.slice(1)}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    `Hello ${store.name}! I am browsing your official online store and have an inquiry.`
  )}`;

  return (
    <footer className={styles.standaloneFooter}>
      {/* Trust & Guarantee Banner */}
      <div className={styles.footerTrustRow}>
        <div className={styles.footerTrustContainer}>
          <div className={styles.footerTrustItem}>
            <div className={styles.footerTrustIconWrap}>
              <span className="material-icons-round">bolt</span>
            </div>
            <div>
              <h5 className={styles.footerTrustTitle}>Fast Nationwide Dispatch</h5>
              <p className={styles.footerTrustDesc}>
                {store.deliverySpeed || "Orders dispatched within 24-48 hours"} across Nigeria.
              </p>
            </div>
          </div>

          <div className={styles.footerTrustItem}>
            <div className={styles.footerTrustIconWrap} style={{ background: "#ecfdf5", color: "#10b981" }}>
              <span className="material-icons-round">account_balance</span>
            </div>
            <div>
              <h5 className={styles.footerTrustTitle}>Direct Bank Transfer</h5>
              <p className={styles.footerTrustDesc}>
                Pay directly to verified store account with instant WhatsApp confirmation.
              </p>
            </div>
          </div>

          <div className={styles.footerTrustItem}>
            <div className={styles.footerTrustIconWrap} style={{ background: "#eef2ff", color: "#4f46e5" }}>
              <span className="material-icons-round">verified</span>
            </div>
            <div>
              <h5 className={styles.footerTrustTitle}>Buyer Protection</h5>
              <p className={styles.footerTrustDesc}>
                7-day return guarantee if goods are defective or not as described.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className={styles.footerMain}>
        <div className={styles.footerContainer}>
          {/* Col 1: Store Brand Info */}
          <div className={styles.footerColBrand}>
            <div className={styles.footerBrandRow}>
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className={styles.footerLogo}
                />
              ) : (
                <div className={styles.footerMonogram}>
                  {(store.name || "S")[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className={styles.footerBrandTitleRow}>
                  <h4 className={styles.footerBrandName}>{store.name}</h4>
                  {store.isVerified && (
                    <span className={`material-icons-round ${styles.footerVerifiedCheck}`}>
                      verified
                    </span>
                  )}
                </div>
                <span className={styles.footerBrandCategory}>
                  {store.category || "Official Online Store"}
                </span>
              </div>
            </div>

            <p className={styles.footerBrandBio}>
              {store.description ||
                `Welcome to the official online store of ${store.name}. Discover curated products, secure bank payments, and express nationwide delivery.`}
            </p>

            <div className={styles.footerWhatsappCtaBox}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerWhatsappBtn}
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>
                  chat
                </span>
                <span>Chat Directly on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className={styles.footerCol}>
            <h5 className={styles.footerColHeading}>Store Navigation</h5>
            <ul className={styles.footerList}>
              <li>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => onTabChange?.("products")}
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => onTabChange?.("about")}
                >
                  About the Merchant
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => onTabChange?.("policies")}
                >
                  Shipping & Dispatch
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={styles.footerLinkBtn}
                  onClick={() => onTabChange?.("policies")}
                >
                  Return Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Location */}
          <div className={styles.footerCol}>
            <h5 className={styles.footerColHeading}>Customer Support</h5>
            <ul className={styles.footerContactList}>
              <li className={styles.footerContactItem}>
                <span className="material-icons-round" style={{ color: "#25D366" }}>
                  chat
                </span>
                <span>WhatsApp: {store.whatsapp || store.whatsappPhone || store.phone || "08038737198"}</span>
              </li>
              {store.email && (
                <li className={styles.footerContactItem}>
                  <span className="material-icons-round" style={{ color: "#2b6dff" }}>
                    mail
                  </span>
                  <span>{store.email}</span>
                </li>
              )}
              <li className={styles.footerContactItem}>
                <span className="material-icons-round" style={{ color: "#64748b" }}>
                  place
                </span>
                <span>{store.location || "Nigeria"}</span>
              </li>
              <li className={styles.footerContactItem}>
                <span className="material-icons-round" style={{ color: "#f59e0b" }}>
                  schedule
                </span>
                <span>Orders taken 24/7 online</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Powered by Sellora */}
      <div className={styles.footerBottomBar}>
        <div className={styles.footerBottomContainer}>
          <p className={styles.footerCopyright}>
            © {currentYear} <strong>{store.name}</strong>. All rights reserved.
          </p>

          <div className={styles.poweredByBadge}>
            <span className={styles.poweredByText}>Powered by</span>
            <Link
              href="https://devico.online"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.poweredByLink}
              title="Sellora — The Modern Peer-to-Peer Nigerian Marketplace"
            >
              <img
                src="/favico.png"
                alt="Sellora"
                width={18}
                height={18}
                className={styles.poweredByLogo}
              />
              <span className={styles.poweredByName}>Sellora</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
