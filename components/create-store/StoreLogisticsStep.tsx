"use client";

import { useState } from "react";
import styles from "./create-store.module.css";
import type { Store } from "@/types/store";

interface StoreLogisticsStepProps {
  store: Store;
  onUpdate: (fields: Partial<Store>) => void;
  onShowToast: (msg: string) => void;
}

const DELIVERY_SPEEDS = [
  "Same-Day Delivery",
  "Ships within 24h",
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
  "Fashion & Apparel": [
    "Streetwear",
    "Footwear",
    "Vintage",
    "Casual",
    "Handmade",
    "Outerwear",
    "Tailored",
  ],
  "Electronics & Audio": [
    "Audio",
    "Headphones",
    "Wireless",
    "Noise-Cancelling",
    "Bluetooth",
    "Hi-Res",
    "Accessories",
  ],
  "Luxury & Watches": [
    "Horology",
    "Timepieces",
    "Stainless Steel",
    "Sapphire",
    "Leather",
    "Automatic",
    "Minimalist",
  ],
  "Skincare & Beauty": [
    "Organic",
    "Cruelty-Free",
    "Glow",
    "Serums",
    "Moisturizer",
    "Botanicals",
    "Dermatology",
  ],
  "Home & Living": [
    "Decor",
    "Lighting",
    "Minimal",
    "Kitchen",
    "Bedding",
    "Artisan",
    "Aesthetic",
  ],
  "Jewelry & Accessories": [
    "Gold",
    "Silver",
    "Handcrafted",
    "Chains",
    "Rings",
    "Pendants",
    "Gemstones",
  ],
};

export default function StoreLogisticsStep({
  store,
  onUpdate,
  onShowToast,
}: StoreLogisticsStepProps) {
  const [customTag, setCustomTag] = useState("");

  const suggestedTags =
    CATEGORY_SUGGESTED_TAGS[store.category] || [
      "Authentic",
      "Fast Shipping",
      "Direct Brand",
      "Premium",
      "Top Quality",
    ];

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, "");
    if (!clean) return;

    if (store.tags.includes(clean)) {
      onShowToast(`Tag #${clean} is already added`);
      return;
    }

    if (store.tags.length >= 8) {
      onShowToast("Maximum 8 tags allowed per store");
      return;
    }

    onUpdate({ tags: [...store.tags, clean] });
    setCustomTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({ tags: store.tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <div className={styles.formCardBody}>
      {/* Delivery Guarantee */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="delivery-speed-select">
          <span className="material-icons-round" style={{ fontSize: "17px", color: "#059669" }}>
            bolt
          </span>
          Delivery Speed Commitment <span className={styles.requiredAsterisk}>*</span>
        </label>
        <p className={styles.fieldHint}>
          Displayed with a green bolt icon on your storefront card to reassure buyers.
        </p>
        <div className={styles.textInputWrap}>
          <span className="material-icons-round">local_shipping</span>
          <select
            id="delivery-speed-select"
            className={styles.selectInput}
            value={store.deliverySpeed}
            onChange={(e) => onUpdate({ deliverySpeed: e.target.value })}
          >
            {DELIVERY_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Response Rate */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="response-rate-select">
          <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
            chat
          </span>
          Customer Response Time
        </label>
        <p className={styles.fieldHint}>
          Informs prospective buyers of your typical reply time on WhatsApp or Sellora chat.
        </p>
        <div className={styles.textInputWrap}>
          <span className="material-icons-round">schedule</span>
          <select
            id="response-rate-select"
            className={styles.selectInput}
            value={store.responseRate}
            onChange={(e) => onUpdate({ responseRate: e.target.value })}
          >
            {RESPONSE_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Specialty Tags */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          <span className="material-icons-round" style={{ fontSize: "17px", color: "#4f46e5" }}>
            label
          </span>
          Search Keywords & Specialty Tags ({store.tags.length}/8)
        </label>
        <p className={styles.fieldHint}>
          Tags appear as clickable pills on your store card to boost discovery in search.
        </p>

        {/* Existing Tags Cloud */}
        {store.tags.length > 0 && (
          <div className={styles.tagsCloud}>
            {store.tags.map((tag) => (
              <span key={tag} className={styles.tagPillItem}>
                #{tag}
                <button
                  type="button"
                  className={styles.tagRemoveBtn}
                  onClick={() => handleRemoveTag(tag)}
                  title={`Remove #${tag}`}
                >
                  <span className="material-icons-round" style={{ fontSize: "14px" }}>
                    close
                  </span>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tag Input */}
        <div className={styles.tagInputRow}>
          <div className={styles.textInputWrap} style={{ flex: 1 }}>
            <span className="material-icons-round">tag</span>
            <input
              type="text"
              className={styles.textInput}
              value={customTag}
              placeholder="e.g. sneakers, vintage, organic..."
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(customTag);
                }
              }}
              maxLength={20}
            />
          </div>
          <button
            type="button"
            className={styles.tagAddBtn}
            onClick={() => handleAddTag(customTag)}
          >
            Add Tag
          </button>
        </div>

        {/* Suggested Tags based on category */}
        <div className={styles.suggestedTagsRow}>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>Suggested:</span>
          {suggestedTags
            .filter((t) => !store.tags.includes(t))
            .slice(0, 5)
            .map((st) => (
              <button
                key={st}
                type="button"
                className={styles.suggestedTagBtn}
                onClick={() => handleAddTag(st)}
              >
                + #{st}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
