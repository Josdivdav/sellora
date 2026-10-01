"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./create-store.module.css";
import StoreSuccessModal from "./StoreSuccessModal";
import type { Store } from "@/types/store";
import type { User } from "firebase/auth";
import { slugifyStoreName } from "@/lib/storeUrl";

interface CreateStoreSetupProps {
  user: User | null;
  onShowToast: (msg: string) => void;
  onStoreCreated?: (store: Store) => void;
}

type StudioTab = "identity" | "visuals" | "logistics";

const CATEGORIES = [
  { name: "Fashion & Apparel", icon: "checkroom" },
  { name: "Electronics & Audio", icon: "headphones" },
  { name: "Luxury & Watches", icon: "watch" },
  { name: "Skincare & Beauty", icon: "spa" },
  { name: "Home & Living", icon: "chair" },
  { name: "Jewelry & Accessories", icon: "diamond" },
  { name: "Gadgets & Tech", icon: "devices" },
  { name: "Sports & Fitness", icon: "fitness_center" },
];

const NIGERIAN_STATES = [
  "Abia, Nigeria",
  "Adamawa, Nigeria",
  "Akwa Ibom, Nigeria",
  "Anambra, Nigeria",
  "Bauchi, Nigeria",
  "Bayelsa, Nigeria",
  "Benue, Nigeria",
  "Borno, Nigeria",
  "Cross River, Nigeria",
  "Delta, Nigeria",
  "Ebonyi, Nigeria",
  "Edo, Nigeria",
  "Ekiti, Nigeria",
  "Enugu, Nigeria",
  "FCT - Abuja, Nigeria",
  "Gombe, Nigeria",
  "Imo, Nigeria",
  "Jigawa, Nigeria",
  "Kaduna, Nigeria",
  "Kano, Nigeria",
  "Katsina, Nigeria",
  "Kebbi, Nigeria",
  "Kogi, Nigeria",
  "Kwara, Nigeria",
  "Lagos, Nigeria",
  "Nasarawa, Nigeria",
  "Niger, Nigeria",
  "Ogun, Nigeria",
  "Ondo, Nigeria",
  "Osun, Nigeria",
  "Oyo, Nigeria",
  "Plateau, Nigeria",
  "Rivers, Nigeria",
  "Sokoto, Nigeria",
  "Taraba, Nigeria",
  "Yobe, Nigeria",
  "Zamfara, Nigeria",
];

const BANNER_PRESETS = [
  {
    name: "Modern Studio",
    url: "/images/banners/banner_1.jpeg",
  },
  {
    name: "Luxury Dark",
    url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80",
  },
  {
    name: "Streetwear",
    url: "/images/banners/banner_3.jpeg",
  },
  {
    name: "Clean Beauty",
    url: "/images/banners/banner_4.jpeg",
  },
  {
    name: "Aesthetic Interior",
    url: "/images/banners/banner_5.jpeg",
  },
  {
    name: "Gold Minimalist",
    url: "/images/banners/banner_6.jpeg",
  },
];

const LOGO_PRESETS = [
  "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&q=80",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&q=80",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&q=80",
  "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&q=80",
];

const BADGE_OPTIONS = [
  "OFFICIAL STORE",
  "VERIFIED SELLER",
  "TOP RATED",
  "ARTISAN BRAND",
  "FAST SHIPPER",
  "PREMIUM MERCHANT",
];

const DELIVERY_SPEEDS = [
  "Ships within 24h",
  "Same-Day Delivery",
  "1-2 Business Days",
  "2-3 Days Nationwide",
  "Express Dispatch",
];

const RESPONSE_RATES = [
  "99% in under an hour",
  "Under 2 hours",
  "Same-day response",
  "24/7 Merchant Support",
];

const CATEGORY_SUGGESTED_TAGS: Record<string, string[]> = {
  "Fashion & Apparel": ["Streetwear", "Footwear", "Tailored", "Accessories", "Casual", "Outerwear"],
  "Electronics & Audio": ["Headphones", "Bluetooth", "Audio", "Wireless", "Noise-Cancelling"],
  "Luxury & Watches": ["Horology", "Timepieces", "Automatic", "Stainless Steel", "Minimalist"],
  "Skincare & Beauty": ["Organic", "Glow", "Serums", "Cruelty-Free", "Natural"],
  "Home & Living": ["Decor", "Aesthetic", "Minimalist", "Furniture", "Lighting"],
  "Jewelry & Accessories": ["Gold", "Silver", "Necklaces", "Rings", "Handcrafted"],
  "Gadgets & Tech": ["Smart Devices", "Wearables", "Accessories", "Chargers"],
  "Sports & Fitness": ["Activewear", "Gym Gear", "Running", "Nutrition"],
};

const INITIAL_STORE: Store = {
  id: "my-sellora-store",
  name: "Apex Luxury Store",
  slug: "apex-luxury-store",
  category: "Fashion & Apparel",
  description: "Curated modern essentials, authentic apparel, and premium accessories for fashion-forward buyers.",
  logo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&q=80",
  banner: "/images/banners/banner_1.jpeg",
  rating: 5.0,
  reviewsCount: 14,
  followersCount: 48,
  productsCount: 6,
  isVerified: true,
  isFavorite: false,
  joinedDate: new Date().toISOString().split("T")[0],
  location: "Lagos, Nigeria",
  deliverySpeed: "Ships within 24h",
  responseRate: "99% in under an hour",
  badge: "OFFICIAL STORE",
  tags: ["Streetwear", "Footwear", "Accessories"],
  topProducts: [],
  phone: "",
  whatsapp: "",
  bankDetails: {
    bankName: "",
    accountNumber: "",
    accountName: "",
  },
};

export default function CreateStoreSetup({
  user,
  onShowToast,
  onStoreCreated = () => {},
}: CreateStoreSetupProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>("identity");
  const [store, setStore] = useState<Store>(INITIAL_STORE);
  const [customTagInput, setCustomTagInput] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [existingStore, setExistingStore] = useState<Store | null>(null);

  // Check if current user already has a store
  useEffect(() => {
    if (!user) {
      setExistingStore(null);
      return;
    }

    let isMounted = true;
    async function checkExistingStore() {
      try {
        const token = await user?.getIdToken();
        if (!token) return;
        const res = await fetch("/api/user/store", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setExistingStore(json.data);
          }
        } else {
          if (isMounted) setExistingStore(null);
        }
      } catch {
        if (isMounted) setExistingStore(null);
      }
    }
    void checkExistingStore();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Update store helper
  const handleUpdate = (fields: Partial<Store>) => {
    setStore((prev) => ({ ...prev, ...fields }));
  };

  const handleNameChange = (newName: string) => {
    const generatedSlug = slugifyStoreName(newName);
    handleUpdate({ name: newName, slug: generatedSlug || store.slug });
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (store.tags?.includes(trimmed)) return;
    const nextTags = [...(store.tags || []), trimmed];
    handleUpdate({ tags: nextTags });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = (store.tags || []).filter((t) => t !== tagToRemove);
    handleUpdate({ tags: nextTags });
  };

  // Launch store submit
  const handlePublishStore = async () => {
    if (!store.name.trim()) {
      setActiveTab("identity");
      onShowToast("Please enter your store brand name");
      return;
    }

    if (!store.slug.trim()) {
      setActiveTab("identity");
      onShowToast("Please specify a store handle / URL slug");
      return;
    }

    if (!agreedToTerms) {
      setActiveTab("logistics");
      onShowToast("Please accept the seller terms to launch your store");
      return;
    }

    if (!user) {
      onShowToast("Please sign in to publish your storefront.");
      return;
    }

    setIsSubmitting(true);
    onShowToast("Launching your storefront...");

    try {
      const token = await user.getIdToken();
      const finalStore: Store = {
        ...store,
        id: user.uid,
        isVerified: true,
        joinedDate: store.joinedDate || new Date().toISOString().split("T")[0],
      };

      const res = await fetch("/api/user/store", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalStore),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        onStoreCreated(finalStore);
        setShowSuccessModal(true);
        onShowToast("Storefront successfully published!");
      } else {
        onShowToast(result.error || "Failed to publish store. Please try again.");
      }
    } catch (err) {
      console.error("Publish error:", err);
      onShowToast("An error occurred while launching store.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const suggestedTags = CATEGORY_SUGGESTED_TAGS[store.category] || [
    "Quality",
    "Verified",
    "Direct",
    "Fast Shipping",
  ];

  return (
    <div className={styles.main}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href="/account/favorites" className={styles.breadcrumbLink}>
          Stores
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Storefront Creator</span>
      </nav>

      {/* Hero Header */}
      <div className={styles.heroHeader}>
        <div className={styles.heroTitleGroup}>
          <h1 className={styles.heroTitle}>
            <span className={`material-icons-round ${styles.heroTitleIcon}`}>rocket_launch</span>
            Storefront Creator Studio
          </h1>
          <p className={styles.heroSubtitle}>
            Configure your brand identity, visuals, and fulfillment to launch a high-converting
            merchant storefront on Sellora.
          </p>
        </div>

        <div className={styles.heroBadge}>
          <span className="material-icons-round" style={{ fontSize: "16px" }}>
            verified
          </span>
          Instant Blue Checkmark
        </div>
      </div>

      {/* Existing Store Alert */}
      {existingStore && (
        <div className={styles.existingStoreBanner}>
          <div className={styles.existingStoreLeft}>
            <div className={styles.existingStoreIcon}>
              <span className="material-icons-round">storefront</span>
            </div>
            <div>
              <div className={styles.existingStoreTitle}>
                You already own an active store: &quot;{existingStore.name}&quot;
              </div>
              <div className={styles.existingStoreDesc}>
                Manage products, inventory, and analytics in your dashboard.
              </div>
            </div>
          </div>
          <Link href="/account/manage-store" className={styles.existingStoreBtn}>
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              dashboard
            </span>
            Manage Store
          </Link>
        </div>
      )}

      {/* 2-Column Studio: Left Forms + Right Live Sticky Preview */}
      <div className={styles.studioGrid}>
        {/* Left Column: Form Studio */}
        <div className={styles.formContainer}>
          {/* Segmented Tab Switcher */}
          <div className={styles.segmentedTabs}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${activeTab === "identity" ? styles.segmentBtnActive : ""}`}
              onClick={() => setActiveTab("identity")}
            >
              <span className="material-icons-round">badge</span>
              1. Brand Identity
            </button>

            <button
              type="button"
              className={`${styles.segmentBtn} ${activeTab === "visuals" ? styles.segmentBtnActive : ""}`}
              onClick={() => setActiveTab("visuals")}
            >
              <span className="material-icons-round">palette</span>
              2. Visuals &amp; Logo
            </button>

            <button
              type="button"
              className={`${styles.segmentBtn} ${activeTab === "logistics" ? styles.segmentBtnActive : ""}`}
              onClick={() => setActiveTab("logistics")}
            >
              <span className="material-icons-round">local_shipping</span>
              3. Logistics &amp; Tags
            </button>
          </div>

          {/* Tab 1: Identity & Bio */}
          {activeTab === "identity" && (
            <div className={styles.studioCard}>
              <div className={styles.cardSectionHeader}>
                <h2 className={styles.cardSectionTitle}>Brand Identity &amp; Positioning</h2>
                <p className={styles.cardSectionSubtitle}>
                  Set your public brand name, custom URL handle, and industry category.
                </p>
              </div>

              {/* Store Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
                    storefront
                  </span>
                  Store Name <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={store.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Apex Luxury Goods"
                  required
                />
                <div className={styles.subdomainPill}>
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    language
                  </span>
                  Store URL:&nbsp;
                  <span className={styles.subdomainText}>
                    {store.slug || "your-store"}.devico.online
                  </span>
                </div>
              </div>

              {/* URL Handle / Slug */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Custom Slug Handle</label>
                <p className={styles.fieldHint}>
                  Unique lowercase identifier for your storefront route and subdomain.
                </p>
                <input
                  type="text"
                  className={styles.textInput}
                  value={store.slug}
                  onChange={(e) => handleUpdate({ slug: slugifyStoreName(e.target.value) })}
                  placeholder="apex-luxury-goods"
                />
              </div>

              {/* Category */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Primary Category</label>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <div
                      key={cat.name}
                      className={`${styles.categoryChip} ${
                        store.category === cat.name ? styles.categoryChipActive : ""
                      }`}
                      onClick={() => handleUpdate({ category: cat.name })}
                    >
                      <span className={`material-icons-round ${styles.categoryIcon}`}>
                        {cat.icon}
                      </span>
                      <span className={styles.categoryName}>{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location (All Nigerian States) */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
                    location_on
                  </span>
                  Operating State (Nigeria)
                </label>
                <select
                  className={styles.selectInput}
                  value={store.location || "Lagos, Nigeria"}
                  onChange={(e) => handleUpdate({ location: e.target.value })}
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Store Bio &amp; About</label>
                <textarea
                  rows={3}
                  className={styles.textareaInput}
                  value={store.description}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  placeholder="Describe your brand, key collections, and why customers should buy from you..."
                />
              </div>

              <div className={styles.cardNavActions}>
                <div />
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setActiveTab("visuals")}
                >
                  Next: Brand Visuals
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Visuals & Cover */}
          {activeTab === "visuals" && (
            <div className={styles.studioCard}>
              <div className={styles.cardSectionHeader}>
                <h2 className={styles.cardSectionTitle}>Visuals &amp; Brand Assets</h2>
                <p className={styles.cardSectionSubtitle}>
                  Customize your storefront cover banner, profile logo, and verification badge.
                </p>
              </div>

              {/* Cover Banner Preset Grid */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Cover Banner Header</label>
                <p className={styles.fieldHint}>
                  Choose from curated studio aesthetics or paste a custom high-resolution banner URL.
                </p>
                <div className={styles.bannerPresets}>
                  {BANNER_PRESETS.map((bp) => (
                    <div
                      key={bp.name}
                      className={`${styles.bannerPresetCard} ${
                        store.banner === bp.url ? styles.bannerPresetActive : ""
                      }`}
                      onClick={() => handleUpdate({ banner: bp.url })}
                    >
                      <Image
                        src={bp.url}
                        alt={bp.name}
                        width={140}
                        height={70}
                        className={styles.bannerPresetImg}
                        unoptimized
                      />
                      <span className={styles.bannerPresetLabel}>{bp.name}</span>
                    </div>
                  ))}
                </div>

                <input
                  type="url"
                  className={styles.textInput}
                  value={store.banner || ""}
                  onChange={(e) => handleUpdate({ banner: e.target.value })}
                  placeholder="Or paste custom banner image URL (https://...)"
                />
              </div>

              {/* Logo Avatar */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Brand Avatar Logo</label>
                <div className={styles.logoPresets}>
                  {LOGO_PRESETS.map((lp, idx) => (
                    <div
                      key={idx}
                      className={`${styles.logoPresetCircle} ${
                        store.logo === lp ? styles.logoPresetActive : ""
                      }`}
                      onClick={() => handleUpdate({ logo: lp })}
                    >
                      <Image
                        src={lp}
                        alt="Logo preset"
                        width={52}
                        height={52}
                        className={styles.logoPresetImg}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>

                <input
                  type="url"
                  className={styles.textInput}
                  value={store.logo || ""}
                  onChange={(e) => handleUpdate({ logo: e.target.value })}
                  placeholder="Or paste custom logo URL (https://...)"
                />
              </div>

              {/* Merchant Badge Selection */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Store Verification Badge</label>
                <div className={styles.badgeGrid}>
                  {BADGE_OPTIONS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      className={`${styles.badgeChip} ${
                        store.badge === bg ? styles.badgeChipActive : ""
                      }`}
                      onClick={() => handleUpdate({ badge: bg })}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.cardNavActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setActiveTab("identity")}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    arrow_back
                  </span>
                  Back
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setActiveTab("logistics")}
                >
                  Next: Logistics &amp; Tags
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Logistics & Tags */}
          {activeTab === "logistics" && (
            <div className={styles.studioCard}>
              <div className={styles.cardSectionHeader}>
                <h2 className={styles.cardSectionTitle}>Fulfillment &amp; Launch</h2>
                <p className={styles.cardSectionSubtitle}>
                  Set your shipping promise, buyer response SLA, and discoverability keywords.
                </p>
              </div>

              {/* Delivery Speed */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Delivery Speed Promise</label>
                <div className={styles.chipsRow}>
                  {DELIVERY_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`${styles.chipOption} ${
                        store.deliverySpeed === speed ? styles.chipOptionActive : ""
                      }`}
                      onClick={() => handleUpdate({ deliverySpeed: speed })}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Rate */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Customer Response Rate</label>
                <div className={styles.chipsRow}>
                  {RESPONSE_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      className={`${styles.chipOption} ${
                        store.responseRate === rate ? styles.chipOptionActive : ""
                      }`}
                      onClick={() => handleUpdate({ responseRate: rate })}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Cloud */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Brand Tags &amp; Specialties</label>
                <p className={styles.fieldHint}>
                  Recommended keywords for {store.category}:
                </p>

                <div className={styles.chipsRow}>
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.chipOption} ${
                        store.tags?.includes(tag) ? styles.chipOptionActive : ""
                      }`}
                      onClick={() => {
                        if (store.tags?.includes(tag)) handleRemoveTag(tag);
                        else handleAddTag(tag);
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                {store.tags && store.tags.length > 0 && (
                  <div className={styles.tagsCloud}>
                    {store.tags.map((t) => (
                      <span key={t} className={styles.tagItem}>
                        {t}
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => handleRemoveTag(t)}
                        >
                          <span className="material-icons-round" style={{ fontSize: "14px" }}>
                            close
                          </span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.tagAddRow}>
                  <input
                    type="text"
                    className={styles.tagInput}
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag(customTagInput);
                        setCustomTagInput("");
                      }
                    }}
                    placeholder="Type custom tag and press Add..."
                  />
                  <button
                    type="button"
                    className={styles.tagAddBtn}
                    onClick={() => {
                      handleAddTag(customTagInput);
                      setCustomTagInput("");
                    }}
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Contact & Payout Section */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#25d366" }}>
                    chat
                  </span>
                  Store WhatsApp Contact Number
                </label>
                <p className={styles.fieldHint}>
                  Buyers will send order confirmation messages to this WhatsApp number upon checkout.
                </p>
                <input
                  type="tel"
                  className={styles.textInput}
                  value={store.whatsapp || store.phone || ""}
                  onChange={(e) =>
                    handleUpdate({
                      whatsapp: e.target.value,
                      phone: e.target.value,
                    })
                  }
                  placeholder="e.g. 08012345678 or 2348012345678"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
                    account_balance
                  </span>
                  Settlement Bank Account (For Customer Bank Transfers)
                </label>
                <p className={styles.fieldHint}>
                  When customers choose Direct Bank Transfer, they will transfer directly to this account.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "8px" }}>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={store.bankDetails?.bankName || ""}
                    onChange={(e) =>
                      handleUpdate({
                        bankDetails: {
                          bankName: e.target.value,
                          accountNumber: store.bankDetails?.accountNumber || "",
                          accountName: store.bankDetails?.accountName || "",
                        },
                      })
                    }
                    placeholder="Bank Name (e.g. OPay, Moniepoint)"
                  />
                  <input
                    type="text"
                    className={styles.textInput}
                    maxLength={10}
                    value={store.bankDetails?.accountNumber || ""}
                    onChange={(e) =>
                      handleUpdate({
                        bankDetails: {
                          bankName: store.bankDetails?.bankName || "",
                          accountNumber: e.target.value.replace(/\D/g, ""),
                          accountName: store.bankDetails?.accountName || "",
                        },
                      })
                    }
                    placeholder="10-digit Account Number"
                  />
                  <input
                    type="text"
                    className={styles.textInput}
                    value={store.bankDetails?.accountName || ""}
                    onChange={(e) =>
                      handleUpdate({
                        bankDetails: {
                          bankName: store.bankDetails?.bankName || "",
                          accountNumber: store.bankDetails?.accountNumber || "",
                          accountName: e.target.value,
                        },
                      })
                    }
                    placeholder="Account Name"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className={styles.termsRow}>
                <input
                  type="checkbox"
                  id="merchant-terms"
                  className={styles.checkboxInput}
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <label htmlFor="merchant-terms" className={styles.termsText}>
                  I agree to Sellora&apos;s Merchant Terms of Service, Seller Guidelines, and
                  customer fulfillment standard.
                </label>
              </div>

              <div className={styles.cardNavActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setActiveTab("visuals")}
                >
                  <span className="material-icons-round" style={{ fontSize: "16px" }}>
                    arrow_back
                  </span>
                  Back
                </button>

                <button
                  type="button"
                  className={styles.launchBtn}
                  onClick={handlePublishStore}
                  disabled={isSubmitting}
                >
                  <span className="material-icons-round">
                    {isSubmitting ? "hourglass_top" : "rocket_launch"}
                  </span>
                  {isSubmitting ? "Publishing Store..." : "Launch Storefront Now"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Live Storefront Preview (Fancy Realistic Mockup) */}
        <div className={styles.previewSticky}>
          <div className={styles.previewContainer}>
            {/* Simulated Browser Bar */}
            <div className={styles.previewTopBar}>
              <div className={styles.previewDots}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </div>
              <div className={styles.previewUrlTag}>
                {store.slug || "your-store"}.devico.online
              </div>
            </div>

            {/* Banner with Badge */}
            <div className={styles.mockupBannerWrap}>
              <Image
                src={store.banner || "/images/banners/banner_1.jpeg"}
                alt="Banner preview"
                fill
                className={styles.mockupBannerImg}
                unoptimized
              />
              <div className={styles.mockupBannerOverlay} />
              <div className={styles.mockupBadgeTop}>{store.badge || "OFFICIAL STORE"}</div>
            </div>

            {/* Storefront Info */}
            <div className={styles.mockupBody}>
              <div className={styles.mockupAvatarRow}>
                <div className={styles.mockupAvatar}>
                  <Image
                    src={
                      store.logo ||
                      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&q=80"
                    }
                    alt="Logo preview"
                    width={64}
                    height={64}
                    className={styles.mockupAvatarImg}
                    unoptimized
                  />
                </div>

                <div className={styles.mockupFollowBtn}>
                  <span className="material-icons-round" style={{ fontSize: "14px" }}>
                    add
                  </span>
                  Follow
                </div>
              </div>

              <h3 className={styles.mockupStoreName}>
                {store.name || "Your Store Name"}
                <span className={`material-icons-round ${styles.mockupVerified}`}>verified</span>
              </h3>

              <div className={styles.mockupMeta}>
                <span>{store.category}</span>
                <span>•</span>
                <span>{store.location || "Lagos, Nigeria"}</span>
                <span>•</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>5.0 ★</span>
              </div>

              <p className={styles.mockupDesc}>
                {store.description || "Your store bio will appear here to welcome buyers..."}
              </p>

              {/* Delivery and SLA Perks */}
              <div className={styles.mockupPerks}>
                <div className={styles.mockupPerkItem}>
                  <span className="material-icons-round">local_shipping</span>
                  <span>{store.deliverySpeed}</span>
                </div>
                <div className={styles.mockupPerkItem}>
                  <span className="material-icons-round">speed</span>
                  <span>{store.responseRate}</span>
                </div>
              </div>

              {/* Tag Chips */}
              {store.tags && store.tags.length > 0 && (
                <div className={styles.mockupTags}>
                  {store.tags.map((t) => (
                    <span key={t} className={styles.mockupTagChip}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Celebration Modal */}
      {showSuccessModal && (
        <StoreSuccessModal store={store} onClose={() => setShowSuccessModal(false)} />
      )}
    </div>
  );
}
