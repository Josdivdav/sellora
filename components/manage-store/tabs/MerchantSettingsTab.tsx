"use client";

import { useState } from "react";
import type { Store } from "@/types/store";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  onSave: (updated: Store) => Promise<void>;
  onShowToast: (msg: string) => void;
}

const CATEGORIES = [
  "Fashion & Apparel",
  "Electronics & Gadgets",
  "Beauty & Personal Care",
  "Home & Living",
  "Food & Groceries",
  "Sports & Fitness",
  "Books & Education",
  "Health & Wellness",
  "Art & Collectibles",
];

export default function MerchantSettingsTab({ store, onSave, onShowToast }: Props) {
  const [form, setForm] = useState({ ...store });
  const [isSaving, setIsSaving] = useState(false);

  const set = (field: keyof Store, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { onShowToast("Store name is required."); return; }
    if (!form.slug.trim()) { onShowToast("Store handle is required."); return; }
    setIsSaving(true);
    try {
      await onSave(form);
    } catch (err: any) {
      onShowToast(err?.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const host = typeof window !== "undefined" ? window.location.host : "sellora";

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Store Settings</h2>
        <p className={styles.tabSubtitle}>Update your storefront identity, branding and logistics</p>
      </div>

      {/* Identity */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Identity</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Store Name *</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your store name"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Store Handle *</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-store-handle"
            />
            <span className={styles.formHint}>{host}/@{form.slug || "your-handle"}</span>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <select className={styles.selectInput} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Location</label>
            <input type="text" className={styles.formInput} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Lagos, Nigeria" />
          </div>
          <div className={styles.formGroupFull}>
            <label className={styles.formLabel}>Store Description</label>
            <textarea
              className={styles.formTextarea}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your store..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Branding</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Logo URL</label>
            <input type="url" className={styles.formInput} value={form.logo || ""} onChange={(e) => set("logo", e.target.value)} placeholder="https://..." />
            {form.logo && (
              <div className={styles.imgPreviewBox}>
                <img src={form.logo} alt="Logo preview" className={styles.imgPreview} style={{ width: 64, height: 64 }} />
              </div>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Banner URL</label>
            <input type="url" className={styles.formInput} value={form.banner || ""} onChange={(e) => set("banner", e.target.value)} placeholder="https://..." />
            {form.banner && (
              <div className={styles.imgPreviewBox}>
                <img src={form.banner} alt="Banner preview" className={styles.imgPreview} style={{ width: "100%", height: 80 }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logistics */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Logistics</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Delivery Speed</label>
            <input type="text" className={styles.formInput} value={form.deliverySpeed || ""} onChange={(e) => set("deliverySpeed", e.target.value)} placeholder="e.g. Ships in 1–3 days" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Response Rate</label>
            <input type="text" className={styles.formInput} value={form.responseRate || ""} onChange={(e) => set("responseRate", e.target.value)} placeholder="e.g. Replies within 1 hour" />
          </div>
        </div>
      </div>

      <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
        <span className="material-icons-round" style={{ fontSize: "18px" }}>
          {isSaving ? "hourglass_empty" : "save"}
        </span>
        {isSaving ? "Saving Changes..." : "Save Changes"}
      </button>
    </div>
  );
}
