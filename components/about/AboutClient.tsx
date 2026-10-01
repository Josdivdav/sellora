"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./about.module.css";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import HomeHeader from "@/components/home/HomeHeader";
import Sidebar from "@/components/SidebarN";
import Toast from "@/components/home/Toast";
import { SignOut } from "@/functions/home.func";

const FAQS = [
  {
    q: "Do I need a registered company (CAC) or BVN to open a store?",
    a: "No! Sellora was built from the ground up for Nigerian creators, students, and independent merchants. You do not need CAC documents or commercial gateway KYC approvals. You can set up your store and start listing products in under 2 minutes.",
  },
  {
    q: "How do merchants get paid for their orders?",
    a: "100% directly into your nominated bank account (OPay, Moniepoint, PalmPay, GTBank, Access, Zenith, etc.) or via Pay on Delivery. Sellora does not hold your funds in escrow, eliminating settlement delays and third-party fee deductions.",
  },
  {
    q: "How does the WhatsApp order confirmation work?",
    a: "When a customer finishes checkout, they click 'Confirm Order via WhatsApp'. Sellora instantly generates a WhatsApp message addressed directly to the store owner's phone number with the order reference, list of items, total amount, and delivery address. You confirm the payment and initiate fulfillment immediately.",
  },
  {
    q: "Can I sell or buy if I am located outside Lagos?",
    a: "Yes! Sellora serves buyers and merchants across all 36 Nigerian states and Abuja FCT. During store creation or checkout, you can select your state and configure your fulfillment promise.",
  },
  {
    q: "What products are allowed on Sellora?",
    a: "Sellora supports fashion & apparel, electronics, beauty & skincare, home decor, artisan goods, books, footwear, gadgets, and customized gifts. Items must be authentic, legal, and clearly described.",
  },
  {
    q: "How do I track my orders as a customer?",
    a: "You can visit 'My Orders' at any time from your account menu to view the full shipment timeline, carrier details, and dispatch milestones for every purchase.",
  },
];

export default function AboutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartCount } = useCart();
  const hasStore = useStoreStatus();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [tutorialTab, setTutorialTab] = useState<"buyer" | "merchant">("buyer");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className={styles.page}>
      <HomeHeader
        search=""
        onSearchChange={(val) => {
          if (val.trim()) router.push(`/?search=${encodeURIComponent(val)}`);
        }}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => router.push("/cart")}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onSignIn={() => router.push("/login")}
        onSignOut={async () => {
          await SignOut();
          setToast("Signed out successfully");
        }}
        hasStore={hasStore}
        onCreateStore={() => router.push("/account/create-store")}
        manageStore={() => router.push("/account/manage-store")}
      />

      <main className={styles.main}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>
            Home
          </Link>
          <span className="material-icons-round" style={{ fontSize: "16px" }}>
            chevron_right
          </span>
          <span className={styles.breadcrumbActive}>About &amp; Getting Started</span>
        </nav>

        {/* Hero Banner */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroBadge}>
            <span className="material-icons-round" style={{ fontSize: "15px", color: "#60a5fa" }}>
              verified
            </span>
            Sellora Marketplace Nigeria
          </div>
          <h1 className={styles.heroTitle}>
            Direct Commerce Built for{" "}
            <span className={styles.heroTitleHighlight}>Nigerian Creators</span> &amp; Modern Shoppers
          </h1>
          <p className={styles.heroDesc}>
            Sellora empowers independent merchants, fashion curators, tech vendors, and artisans to launch online storefronts with zero payment gateway friction. Direct bank transfers, instant WhatsApp order confirmation, and trusted nationwide delivery across all 36 states.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/account/create-store" className={styles.primaryHeroBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                storefront
              </span>
              Start Selling Free
            </Link>
            <a href="#tutorial" className={styles.secondaryHeroBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                menu_book
              </span>
              How It Works Tutorial
            </a>
            <Link href="/" className={styles.secondaryHeroBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                shopping_bag
              </span>
              Browse Marketplace
            </Link>
          </div>
        </section>

        {/* Marketplace Statistics & Highlights */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: "#ecfdf5", color: "#059669" }}>
              <span className="material-icons-round">payments</span>
            </div>
            <div>
              <div className={styles.statNumber}>0% Fees</div>
              <p className={styles.statLabel}>No payment gateway cuts. 100% of order totals go straight to the seller.</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: "#eef2ff", color: "#4f46e5" }}>
              <span className="material-icons-round">chat</span>
            </div>
            <div>
              <div className={styles.statNumber}>1-Click WhatsApp</div>
              <p className={styles.statLabel}>Real-time order routing and instant proof-of-payment confirmation.</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: "#fef3c7", color: "#d97706" }}>
              <span className="material-icons-round">local_shipping</span>
            </div>
            <div>
              <div className={styles.statNumber}>36 States + FCT</div>
              <p className={styles.statLabel}>Doorstep fulfillment and real-time carrier tracking across all of Nigeria.</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrap} style={{ background: "#f3e8ff", color: "#7c3aed" }}>
              <span className="material-icons-round">badge</span>
            </div>
            <div>
              <div className={styles.statNumber}>Verified Stores</div>
              <p className={styles.statLabel}>Direct merchant identity, customer reviews, and fulfillment commitment SLAs.</p>
            </div>
          </div>
        </div>

        {/* Interactive "How to Get Started" Tutorial */}
        <section id="tutorial" className={styles.tutorialContainer}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <span className="material-icons-round" style={{ fontSize: "15px" }}>
                school
              </span>
              Step-by-Step Guide
            </div>
            <h2 className={styles.sectionTitle}>How to Get Started on Sellora</h2>
            <p className={styles.sectionSubtitle}>
              Whether you are looking to shop curated collections or launch your own digital storefront, getting started takes just a few clicks.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className={styles.tabSwitcher}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tutorialTab === "buyer" ? styles.tabBtnActive : ""}`}
              onClick={() => setTutorialTab("buyer")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                shopping_cart
              </span>
              I Want to Buy
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tutorialTab === "merchant" ? styles.tabBtnActive : ""}`}
              onClick={() => setTutorialTab("merchant")}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                storefront
              </span>
              I Want to Sell
            </button>
          </div>

          {/* Buyer Tutorial Steps */}
          {tutorialTab === "buyer" && (
            <div className={styles.tutorialStepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#4f46e5" }}>
                      search
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Explore &amp; Discover</h3>
                <p className={styles.stepDesc}>
                  Browse products across Nigeria. Filter by category, price, state location, or visit specific brand storefronts to view their full catalog.
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#059669" }}>
                    check_circle
                  </span>
                  100% verified merchants with real customer reviews
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#2563eb" }}>
                      add_shopping_cart
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Add to Cart &amp; Checkout</h3>
                <p className={styles.stepDesc}>
                  Select your items and proceed to the streamlined checkout. Enter your delivery address and choose your preferred shipping speed (Standard or Express).
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#2563eb" }}>
                    bolt
                  </span>
                  No complicated registration forms required to shop
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#16a34a" }}>
                      account_balance
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Pay Safely</h3>
                <p className={styles.stepDesc}>
                  Choose <strong>Cash / POS on Delivery</strong> to pay upon parcel arrival, or select <strong>Direct Bank Transfer</strong> to pay directly into the merchant&apos;s verified bank account.
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#16a34a" }}>
                    content_copy
                  </span>
                  1-click bank account number copy button
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#25d366" }}>
                      chat
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>WhatsApp Order Confirmation</h3>
                <p className={styles.stepDesc}>
                  On the order confirmation screen, click <strong>Confirm via WhatsApp</strong> to instantly send your order receipt directly to the seller&apos;s phone for rapid dispatch.
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#25d366" }}>
                    mark_chat_read
                  </span>
                  Direct line with the seller from order to doorstep
                </div>
              </div>
            </div>
          )}

          {/* Merchant Tutorial Steps */}
          {tutorialTab === "merchant" && (
            <div className={styles.tutorialStepsGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#7c3aed" }}>
                      edit_note
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Create Your Storefront</h3>
                <p className={styles.stepDesc}>
                  Head to <strong>Create Store</strong>. Choose your store brand name, unique URL handle (e.g. <code>sellora.com/my-boutique</code>), primary category, and Nigerian state location.
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#7c3aed" }}>
                    schedule
                  </span>
                  Takes under 60 seconds with no corporate CAC paperwork
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#25d366" }}>
                      account_balance_wallet
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Set Bank &amp; WhatsApp</h3>
                <p className={styles.stepDesc}>
                  Input your customer service WhatsApp number and your settlement Nigerian bank account (OPay, Moniepoint, PalmPay, GTBank, etc.) for direct customer payouts.
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#059669" }}>
                    verified
                  </span>
                  0% transaction gateway fees — keep 100% of your earnings
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#2563eb" }}>
                      add_photo_alternate
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>List Your Products</h3>
                <p className={styles.stepDesc}>
                  Upload high-resolution product photos, set prices, stock quantities, and search tags. Choose your delivery promise (e.g. &quot;Ships within 24h&quot;).
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#2563eb" }}>
                    cloud_upload
                  </span>
                  Instant image uploads with automatic optimization
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepIconBadge}>
                    <span className="material-icons-round" style={{ color: "#ea580c" }}>
                      rocket_launch
                    </span>
                  </div>
                </div>
                <h3 className={styles.stepTitle}>Share &amp; Fulfill Orders</h3>
                <p className={styles.stepDesc}>
                  Share your custom Sellora store link across Instagram, TikTok, and WhatsApp. When orders arrive, verify payment on WhatsApp and fulfill smoothly!
                </p>
                <div className={styles.stepHighlightBox}>
                  <span className="material-icons-round" style={{ color: "#ea580c" }}>
                    share
                  </span>
                  One shareable link for your entire product catalog
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Why Sellora? Direct Comparison */}
        <section className={styles.comparisonGrid}>
          <div className={styles.comparisonCardLegacy}>
            <div className={styles.comparisonPill}>Traditional Marketplaces &amp; Gateways</div>
            <h3 className={styles.comparisonTitle}>The Bureaucratic Way</h3>
            <ul className={styles.comparisonList}>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#e11d48" }}>
                  cancel
                </span>
                Requires 18+ BVN, CAC registration, and lengthy corporate verification
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#e11d48" }}>
                  cancel
                </span>
                High payment gateway processing fees (1.5% to 2.5% + ₦100 per transaction)
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#e11d48" }}>
                  cancel
                </span>
                T+2 delayed settlement payouts and risk of account holds
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#e11d48" }}>
                  cancel
                </span>
                Zero direct communication with customers when issues arise
              </li>
            </ul>
          </div>

          <div className={styles.comparisonCardSellora}>
            <div className={styles.comparisonPill}>The Sellora Advantage</div>
            <h3 className={styles.comparisonTitle}>Peer-to-Peer &amp; Direct</h3>
            <ul className={styles.comparisonList}>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#16a34a" }}>
                  check_circle
                </span>
                Zero KYC barriers — designed for students, young creators, and independent sellers
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#16a34a" }}>
                  check_circle
                </span>
                0% gateway fee deduction — customers transfer directly to your bank account
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#16a34a" }}>
                  check_circle
                </span>
                Immediate settlement: your money enters your account the moment buyer pays
              </li>
              <li className={styles.comparisonItem}>
                <span className="material-icons-round" style={{ color: "#16a34a" }}>
                  check_circle
                </span>
                1-click WhatsApp messaging creates long-term customer relationships
              </li>
            </ul>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionBadge}>
              <span className="material-icons-round" style={{ fontSize: "15px" }}>
                help_outline
              </span>
              Common Inquiries
            </div>
            <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
            <p className={styles.sectionSubtitle}>Everything you need to know about buying and selling on Sellora.</p>
          </div>

          <div>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="material-icons-round" style={{ color: "#64748b", fontSize: "20px" }}>
                      {isOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>
                  {isOpen && <div className={styles.faqAnswer}>{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className={styles.ctaBanner}>
          <h2 className={styles.ctaTitle}>Ready to Grow Your Business?</h2>
          <p className={styles.ctaSubtitle}>
            Join hundreds of forward-thinking Nigerian merchants selling fashion, tech, cosmetics, and lifestyle goods on Sellora today.
          </p>
          <div className={styles.ctaBtns}>
            <Link href="/account/create-store" className={styles.ctaPrimaryBtn}>
              <span className="material-icons-round" style={{ fontSize: "18px", verticalAlign: "middle", marginRight: "6px" }}>
                rocket_launch
              </span>
              Create Your Storefront Now
            </Link>
            <Link href="/" className={styles.ctaSecondaryBtn}>
              Start Shopping
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image src="/favico.png" alt="Sellora" width={28} height={28} />
            <p className={styles.footerCopy}>
              &copy; {new Date().getFullYear()} Sellora Marketplace. Built for Nigerian commerce.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/" className={styles.footerLink}>
              Browse
            </Link>
            <Link href="/about" className={styles.footerLink}>
              About
            </Link>
            <Link href="/about#tutorial" className={styles.footerLink}>
              Tutorial
            </Link>
            <Link href="/account/create-store" className={styles.footerLink}>
              Sell on Sellora
            </Link>
          </div>
        </div>
      </footer>

      {toast && <Toast message={toast} />}
    </div>
  );
}
