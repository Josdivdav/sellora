"use client";

import { useRef, ChangeEvent } from "react";
import styles from "./create-store.module.css";
import type { Store } from "@/types/store";

interface StoreVisualsStepProps {
  store: Store;
  onUpdate: (fields: Partial<Store>) => void;
  onShowToast: (msg: string) => void;
}

const BANNER_PRESETS = [
  {
    name: "Modern Tech / Studio",
    url: "/images/banners/banner_1.jpeg",
  },
  {
    name: "Luxury Horology / Dark",
    url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80",
  },
  {
    name: "Urban Footwear & Streetwear",
    url: "/images/banners/banner_3.jpeg",
  },
  {
    name: "Botanicals & Clean Beauty",
    url: "/images/banners/banner_4.jpeg",
  },
  {
    name: "Aesthetic Interior & Decor",
    url: "/images/banners/banner_5.jpeg",
  },
  {
    name: "Jewelry & Gold Minimalist",
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
  "NEW ARRIVAL",
];

export default function StoreVisualsStep({
  store,
  onUpdate,
  onShowToast,
}: StoreVisualsStepProps) {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleBannerFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast("Image too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ banner: String(reader.result) });
      onShowToast("Custom banner applied!");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      onShowToast("Logo too large. Please select an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpdate({ logo: String(reader.result) });
      onShowToast("Store logo updated!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.formCardBody}>
      {/* Cover Banner */}
      <div className={styles.fieldGroup}>
        <div className={styles.fieldHeader}>
          <label className={styles.fieldLabel}>
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
              panorama
            </span>
            Storefront Cover Banner <span className={styles.requiredAsterisk}>*</span>
          </label>
        </div>
        <p className={styles.fieldHint}>
          Pick a curated photography theme or upload your own 1200x400 header image.
        </p>

        <div className={styles.bannerPresetsGrid}>
          {BANNER_PRESETS.map((preset) => {
            const isActive = store.banner === preset.url;
            return (
              <button
                key={preset.name}
                type="button"
                className={`${styles.bannerThumbOption} ${isActive ? styles.bannerThumbActive : ""}`}
                onClick={() => onUpdate({ banner: preset.url })}
                title={preset.name}
              >
                <img src={preset.url} alt={preset.name} />
                {isActive && (
                  <span className={styles.bannerSelectedCheck}>
                    <span className="material-icons-round">check</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.bannerCustomUploadRow}>
          <label className={styles.uploadFileBtn}>
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              cloud_upload
            </span>
            Upload Custom Banner
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenFileInput}
              onChange={handleBannerFile}
            />
          </label>
          <span className={styles.uploadInfoText}>
            Recommended: 1200 × 400px (3:1 ratio). Max 5MB PNG, JPG or WebP.
          </span>
        </div>
      </div>

      {/* Store Logo / Avatar */}
      <div className={styles.fieldGroup}>
        <div className={styles.fieldHeader}>
          <label className={styles.fieldLabel}>
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
              account_circle
            </span>
            Store Brand Logo / Avatar <span className={styles.requiredAsterisk}>*</span>
          </label>
        </div>
        <p className={styles.fieldHint}>
          The circular brand avatar displayed on store cards, search results, and checkout items.
        </p>

        <div className={styles.logoSection}>
          <div className={styles.logoAvatarPreview}>
            {store.logo ? (
              <img src={store.logo} alt="Store logo" className={styles.logoAvatarImg} />
            ) : (
              <span className={styles.logoLetterFallback}>
                {(store.name || "S").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className={styles.logoActions}>
            <div className={styles.logoActionsButtons}>
              <label className={styles.uploadFileBtn}>
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  photo_camera
                </span>
                Upload Logo
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenFileInput}
                  onChange={handleLogoFile}
                />
              </label>

              {store.logo && (
                <button
                  type="button"
                  className={styles.removeActionBtn}
                  onClick={() => onUpdate({ logo: "" })}
                >
                  Use Letter Avatar
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>Presets:</span>
              {LOGO_PRESETS.map((pUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onUpdate({ logo: pUrl })}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: store.logo === pUrl ? "2px solid #4f46e5" : "1px solid #d1d5db",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <img
                    src={pUrl}
                    alt="Preset logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
