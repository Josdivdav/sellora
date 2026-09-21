"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./create-store.module.css";
import StoreIdentityStep from "./StoreIdentityStep";
import StoreVisualsStep from "./StoreVisualsStep";
import StoreLogisticsStep from "./StoreLogisticsStep";
import StoreReviewStep from "./StoreReviewStep";
import StoreSuccessModal from "./StoreSuccessModal";
import type { Store, StoreTopProduct } from "@/types/store";
import type { User } from "firebase/auth";
import productsData from "@/data/products.json";

interface CreateStoreSetupProps {
  user: User | null;
  onShowToast: (msg: string) => void;
  onStoreCreated?: (store: Store) => void;
}

const DEFAULT_TOP_PRODUCTS: StoreTopProduct[] = [
  {
    id: "preview-1",
    name: "Signature Streetwear Hoodie",
    price: 38000,
    oldPrice: 45000,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
    rating: 4.8,
  },
  {
    id: "preview-2",
    name: "Minimalist Leather Sneakers",
    price: 52000,
    oldPrice: 65000,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
    rating: 4.9,
  },
  {
    id: "preview-3",
    name: "Vintage Utility Crossbody Bag",
    price: 24000,
    oldPrice: 30000,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    rating: 4.7,
  },
];

const INITIAL_STORE: Store = {
  id: "my-sellora-store",
  name: "Aura Studio",
  slug: "aura-studio",
  category: "Fashion & Apparel",
  description:
    "Curated contemporary streetwear, authentic bespoke fashion, and premium accessories designed for discerning trendsetters.",
  logo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&q=80",
  banner: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&q=80",
  rating: 5.0,
  reviewsCount: 0,
  followersCount: 1,
  productsCount: 3,
  isVerified: true,
  isFavorite: true,
  joinedDate: new Date().toISOString().split("T")[0],
  location: "Lagos, Nigeria",
  deliverySpeed: "Ships within 24h",
  responseRate: "99% in under an hour",
  badge: "OFFICIAL STORE",
  tags: ["Fashion", "Streetwear", "Footwear", "Accessories"],
  topProducts: DEFAULT_TOP_PRODUCTS,
};

const TEMPLATES = [
  {
    label: "Streetwear & Fashion",
    icon: "checkroom",
    data: {
      name: "Kicks & Street",
      slug: "kicks-and-street",
      category: "Fashion & Apparel",
      description:
        "Exclusive sneaker releases, premium Japanese denim, graphic tees, and modern oversized streetwear essentials.",
      banner: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&q=80",
      logo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&q=80",
      badge: "OFFICIAL STORE",
      tags: ["Sneakers", "Streetwear", "Footwear", "LimitedEdition"],
      location: "Lagos, Nigeria",
      deliverySpeed: "Same-Day Delivery",
    },
  },
  {
    label: "Audio & Flagship Tech",
    icon: "headphones",
    data: {
      name: "Sonic Audio Lab",
      slug: "sonic-audio-lab",
      category: "Electronics & Audio",
      description:
        "Authorized distributor for audiophile gear, studio headphones, and high-fidelity wireless sound systems.",
      banner: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80",
      logo: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&q=80",
      badge: "TOP RATED",
      tags: ["Audio", "Headphones", "Wireless", "Hi-Res"],
      location: "Abuja, Nigeria",
      deliverySpeed: "Ships within 24h",
    },
  },
  {
    label: "Horology & Luxury",
    icon: "watch",
    data: {
      name: "Chronos Vault",
      slug: "chronos-vault",
      category: "Luxury & Watches",
      description:
        "Bespoke horology and minimalist timepieces crafted with sapphire glass, 316L stainless steel, and top-grain Italian leather.",
      banner: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80",
      logo: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&q=80",
      badge: "PREMIUM MERCHANT",
      tags: ["Watches", "Horology", "Luxury", "Bespoke"],
      location: "Lagos, Nigeria",
      deliverySpeed: "1-2 Business Days",
    },
  },
  {
    label: "Botanical Skincare",
    icon: "spa",
    data: {
      name: "Glow & Co",
      slug: "glow-and-co",
      category: "Skincare & Beauty",
      description:
        "Dermatologist-tested skincare crafted with cold-pressed botanical oils, hyaluronic complexes, and natural vitamins.",
      banner: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80",
      logo: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&q=80",
      badge: "ARTISAN BRAND",
      tags: ["Skincare", "Organic", "CrueltyFree", "Glow"],
      location: "Port Harcourt, Nigeria",
      deliverySpeed: "Ships within 24h",
    },
  },
];

export default function CreateStoreSetup({
  user,
  onShowToast,
  onStoreCreated = () => {},
}: CreateStoreSetupProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [store, setStore] = useState<Store>(INITIAL_STORE);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [existingStore, setExistingStore] = useState<Store | null>(null);

  // Check if user already has a store
  useEffect(() => {
    try {
      const existing = localStorage.getItem("sellora_my_store");
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed && parsed.name) {
          setExistingStore(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleUpdate = (fields: Partial<Store>) => {
    setStore((prev) => ({ ...prev, ...fields }));
  };

  const applyTemplate = (templateData: Partial<Store>) => {
    setStore((prev) => ({
      ...prev,
      ...templateData,
      id: `store-${templateData.slug || prev.slug}`,
    }));
    onShowToast(`Applied ${templateData.name} template!`);
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!store.name.trim()) {
        onShowToast("Please enter your store name");
        return false;
      }
      if (!store.slug.trim()) {
        onShowToast("Please provide a valid store handle");
        return false;
      }
      if (!store.description.trim()) {
        onShowToast("Please enter a short description for your store");
        return false;
      }
    }
    if (step === 2) {
      if (!store.banner) {
        onShowToast("Please select or upload a cover banner");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    } else {
      handlePublishStore();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handlePublishStore = () => {
    if (!agreedToTerms) {
      onShowToast("Please accept the merchant terms of service to proceed");
      return;
    }

    const finalStore: Store = {
      ...store,
      id: store.id || `store-${store.slug}`,
      isVerified: true,
      joinedDate: store.joinedDate || new Date().toISOString().split("T")[0],
    };

    // Save to localStorage
    try {
      localStorage.setItem("sellora_my_store", JSON.stringify(finalStore));

      // Also add to favorites list so it appears in /account/favorites
      const favStored = localStorage.getItem("sellora_favorite_stores");
      let favList: string[] = [];
      if (favStored) {
        try {
          favList = JSON.parse(favStored);
        } catch {
          favList = [];
        }
      }
      if (!favList.includes(finalStore.id)) {
        favList.unshift(finalStore.id);
        localStorage.setItem("sellora_favorite_stores", JSON.stringify(favList));
      }

      window.dispatchEvent(new Event("sellora_favorites_updated"));
      window.dispatchEvent(new Event("sellora_store_created"));
    } catch {
      // ignore
    }

    onStoreCreated(finalStore);
    onShowToast("Storefront successfully published!");
    setShowSuccessModal(true);
  };

  const stepTitles = [
    { num: 1, name: "Store Identity", sub: "Name, URL & Bio" },
    { num: 2, name: "Visuals & Cover", sub: "Banner & Logo" },
    { num: 3, name: "Logistics & Tags", sub: "Shipping & Specialties" },
    { num: 4, name: "Review & Launch", sub: "Final Confirmation" },
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
        <span>Open a Store</span>
      </nav>

      {/* Page Heading */}
      <div className={styles.pageHeading}>
        <div className={styles.titleRow}>
          <h1>
            <span className={`material-icons-round ${styles.titleIcon}`}>storefront</span>
            Create Your Storefront
          </h1>
          <span className={styles.verifiedBadge}>
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              verified
            </span>
            Instant Merchant Status
          </span>
        </div>
        <p className={styles.subtitle}>
          Launch your brand on Sellora, customize your cover banner and catalog, and reach thousands of verified shoppers with direct fulfillment.
        </p>
      </div>

      {/* Existing Store Notice if user already has one */}
      {existingStore && (
        <div className={styles.existingStoreNotice}>
          <div className={styles.existingStoreInfo}>
            <span className="material-icons-round">storefront</span>
            <div>
              <strong>You already have an active storefront: {existingStore.name}</strong>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                sellora.ng/@{existingStore.slug} • Add, edit, or delete products and manage inventory in your Store Dashboard.
              </div>
            </div>
          </div>
          <Link href="/manage-store" className={styles.existingStoreBtn}>
            Go to Manage Store
          </Link>
        </div>
      )}

      {/* Highlights Banner */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconIndigo}`}>
            <span className="material-icons-round">verified</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statVal}>Instant Verification</span>
            <span className={styles.statDesc}>Official blue checkmark</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRose}`}>
            <span className="material-icons-round">speed</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statVal}>Instant Setup</span>
            <span className={styles.statDesc}>Launch in under 2 minutes</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconEmerald}`}>
            <span className="material-icons-round">local_shipping</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statVal}>Express Delivery</span>
            <span className={styles.statDesc}>Integrated fulfillment tag</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
            <span className="material-icons-round">payments</span>
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statVal}>Zero Setup Fees</span>
            <span className={styles.statDesc}>Keep 100% of initial sales</span>
          </div>
        </div>
      </div>

      {/* Quick Template Strip */}
      <div className={styles.presetStrip}>
        <div className={styles.presetLabel}>
          <span className="material-icons-round">auto_awesome</span>
          <span>Quick Inspiration Templates:</span>
        </div>
        <div className={styles.presetButtons}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className={styles.presetBtn}
              onClick={() => applyTemplate(tpl.data)}
            >
              <span className="material-icons-round" style={{ fontSize: "15px" }}>
                {tpl.icon}
              </span>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className={styles.stepperContainer}>
        <div className={styles.stepperTrack}>
          {stepTitles.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isActive = currentStep === step.num;
            const isPending = currentStep < step.num;

            return (
              <div key={step.num} style={{ display: "flex", alignItems: "center", flex: idx < stepTitles.length - 1 ? 1 : "initial" }}>
                <button
                  type="button"
                  className={`${styles.stepNode} ${
                    isCompleted
                      ? styles.stepCompleted
                      : isActive
                      ? styles.stepActive
                      : styles.stepPending
                  }`}
                  onClick={() => {
                    if (isCompleted || validateStep(currentStep)) {
                      setCurrentStep(step.num);
                    }
                  }}
                >
                  <div className={styles.stepCircle}>
                    {isCompleted ? (
                      <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        check
                      </span>
                    ) : (
                      step.num
                    )}
                  </div>
                  <div className={styles.stepText}>
                    <span className={styles.stepName}>{step.name}</span>
                    <span className={styles.stepSub}>{step.sub}</span>
                  </div>
                </button>
                {idx < stepTitles.length - 1 && (
                  <div
                    className={`${styles.stepLine} ${
                      currentStep > step.num ? styles.stepLineActive : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Studio: Form & Live Preview */}
      <div className={styles.studioGrid}>
        {/* Left Column: Form Card */}
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <h3 className={styles.formStepTitle}>
              <span className="material-icons-round" style={{ color: "#4f46e5" }}>
                {currentStep === 1 && "badge"}
                {currentStep === 2 && "palette"}
                {currentStep === 3 && "local_shipping"}
                {currentStep === 4 && "verified"}
              </span>
              {stepTitles[currentStep - 1].name}
            </h3>
            <span className={styles.formStepTag}>Step {currentStep} of 4</span>
          </div>

          {currentStep === 1 && (
            <StoreIdentityStep store={store} onUpdate={handleUpdate} />
          )}

          {currentStep === 2 && (
            <StoreVisualsStep
              store={store}
              onUpdate={handleUpdate}
              onShowToast={onShowToast}
            />
          )}

          {currentStep === 3 && (
            <StoreLogisticsStep
              store={store}
              onUpdate={handleUpdate}
              onShowToast={onShowToast}
            />
          )}

          {currentStep === 4 && (
            <StoreReviewStep
              store={store}
              agreedToTerms={agreedToTerms}
              onToggleTerms={setAgreedToTerms}
            />
          )}

          <div className={styles.formCardFooter}>
            {currentStep > 1 ? (
              <button
                type="button"
                className={styles.backBtn}
                onClick={handlePrevStep}
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>
                  arrow_back
                </span>
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              className={styles.primarySubmitBtn}
              onClick={handleNextStep}
            >
              {currentStep < 4 ? (
                <>
                  Continue to {stepTitles[currentStep].name}
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    arrow_forward
                  </span>
                </>
              ) : (
                <>
                  <span className="material-icons-round" style={{ fontSize: "18px" }}>
                    rocket_launch
                  </span>
                  Launch Storefront Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showSuccessModal && (
        <StoreSuccessModal
          store={store}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );
}
