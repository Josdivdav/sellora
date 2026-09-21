"use client";

import styles from "./create-store.module.css";
import type { Store } from "@/types/store";

interface StoreIdentityStepProps {
  store: Store;
  onUpdate: (fields: Partial<Store>) => void;
}

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

const POPULAR_LOCATIONS = [
  "Lagos, Nigeria",
  "Abuja, Nigeria",
  "Port Harcourt, Nigeria",
  "Ibadan, Nigeria",
  "Enugu, Nigeria",
  "Kano, Nigeria",
  "Asaba, Nigeria",
];

export default function StoreIdentityStep({ store, onUpdate }: StoreIdentityStepProps) {
  const handleNameChange = (newName: string) => {
    // Generate clean slug if user hasn't explicitly customized it wildly
    const generatedSlug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    onUpdate({
      name: newName,
      slug: generatedSlug || store.slug,
    });
  };

  return (
    <div className={styles.formCardBody}>
      {/* Store Name */}
      <div className={styles.fieldGroup}>
        <div className={styles.fieldHeader}>
          <label className={styles.fieldLabel} htmlFor="store-name-input">
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
              storefront
            </span>
            Store Name <span className={styles.requiredAsterisk}>*</span>
          </label>
        </div>
        <p className={styles.fieldHint}>
          The public brand name buyers will see across Sellora.
        </p>
        <div className={styles.textInputWrap}>
          <span className="material-icons-round">edit</span>
          <input
            id="store-name-input"
            type="text"
            className={styles.textInput}
            value={store.name}
            placeholder="e.g. Olu's Fashion House, UV Audio Lab..."
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={50}
            required
          />
        </div>
      </div>

      {/* Store Handle / Slug */}
      <div className={styles.fieldGroup}>
        <div className={styles.fieldHeader}>
          <label className={styles.fieldLabel} htmlFor="store-slug-input">
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
              alternate_email
            </span>
            Storefront Handle & Link <span className={styles.requiredAsterisk}>*</span>
          </label>
        </div>
        <p className={styles.fieldHint}>
          Your personalized shareable Sellora store URL.
        </p>
        <div className={styles.textInputWrap}>
          <span className={styles.slugPrefix}>sellora.ng/@</span>
          <input
            id="store-slug-input"
            type="text"
            className={`${styles.textInput} ${styles.slugInput}`}
            value={store.slug}
            placeholder="store-handle"
            onChange={(e) =>
              onUpdate({
                slug: e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .replace(/-+/g, "-"),
              })
            }
            maxLength={30}
            required
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
            category
          </span>
          Primary Category <span className={styles.requiredAsterisk}>*</span>
        </label>
        <p className={styles.fieldHint}>
          Select the main merchandise category your store specializes in.
        </p>
        <div className={styles.categoryPills}>
          {CATEGORIES.map((cat) => {
            const isSelected = store.category === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                className={`${styles.catPill} ${isSelected ? styles.catPillActive : ""}`}
                onClick={() => onUpdate({ category: cat.name })}
              >
                <span className="material-icons-round" style={{ fontSize: "16px" }}>
                  {cat.icon}
                </span>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div className={styles.fieldGroup}>
        <div className={styles.fieldHeader}>
          <label className={styles.fieldLabel} htmlFor="store-desc-input">
            <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
              notes
            </span>
            Store Bio / Tagline <span className={styles.requiredAsterisk}>*</span>
          </label>
          <span className={styles.charCount}>{store.description.length}/240</span>
        </div>
        <p className={styles.fieldHint}>
          Briefly summarize your craftsmanship, authenticity, or product guarantee.
        </p>
        <div className={`${styles.textInputWrap} ${styles.textareaWrap}`}>
          <span className="material-icons-round">short_text</span>
          <textarea
            id="store-desc-input"
            className={styles.textareaInput}
            value={store.description}
            placeholder="Describe what makes your store unique, products offered, and quality assurance..."
            onChange={(e) => onUpdate({ description: e.target.value.slice(0, 240) })}
            rows={3}
            required
          />
        </div>
      </div>

      {/* Location */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="store-location-select">
          <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
            location_on
          </span>
          Store Origin / Dispatch Location <span className={styles.requiredAsterisk}>*</span>
        </label>
        <p className={styles.fieldHint}>
          Helps nearby customers calculate accurate transit times and shipping estimates.
        </p>
        <div className={styles.textInputWrap}>
          <span className="material-icons-round">pin_drop</span>
          <select
            id="store-location-select"
            className={styles.selectInput}
            value={store.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
          >
            {POPULAR_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
