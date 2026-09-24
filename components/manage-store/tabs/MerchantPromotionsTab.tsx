"use client";

import { useState } from "react";
import type { Store } from "@/types/store";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  onShowToast: (msg: string) => void;
}

interface PromoForm {
  code: string;
  type: "percentage" | "fixed";
  value: string;
  minOrder: string;
  expiry: string;
}

const DEFAULT_FORM: PromoForm = {
  code: "",
  type: "percentage",
  value: "",
  minOrder: "",
  expiry: "",
};

export default function MerchantPromotionsTab({ store, onShowToast }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromoForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof PromoForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      onShowToast("Please enter a promo code.");
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      onShowToast("Please enter a valid discount value.");
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setShowForm(false);
    setForm(DEFAULT_FORM);
    onShowToast("Promo code saved! (Full feature coming soon)");
  };

  return (
    <div className={styles.tabPage}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.tabTitle}>Promotions &amp; Discounts</h2>
          <p className={styles.tabSubtitle}>Create discount codes to attract more buyers</p>
        </div>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setShowForm((v) => !v)}
        >
          <span className="material-icons-round" style={{ fontSize: "17px" }}>
            {showForm ? "close" : "add"}
          </span>
          {showForm ? "Cancel" : "Create Promo Code"}
        </button>
      </div>

      {/* Inline creation form */}
      {showForm && (
        <div className={styles.promoFormCard}>
          <h3 className={styles.promoFormTitle}>New Promo Code</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Promo Code *</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. SAVE20"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Discount Type</label>
              <select
                className={styles.selectInput}
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₦)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Discount Value * {form.type === "percentage" ? "(%)" : "(₦)"}
              </label>
              <input
                type="number"
                className={styles.formInput}
                placeholder={form.type === "percentage" ? "e.g. 20" : "e.g. 5000"}
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                min={0}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Min. Order Value (₦)</label>
              <input
                type="number"
                className={styles.formInput}
                placeholder="e.g. 10000"
                value={form.minOrder}
                onChange={(e) => handleChange("minOrder", e.target.value)}
                min={0}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expiry Date</label>
              <input
                type="date"
                className={styles.formInput}
                value={form.expiry}
                onChange={(e) => handleChange("expiry", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.formRow}>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={isSaving}
            >
              <span className="material-icons-round" style={{ fontSize: "17px" }}>
                {isSaving ? "hourglass_empty" : "check"}
              </span>
              {isSaving ? "Saving..." : "Save Promo Code"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <span className="material-icons-round">local_offer</span>
        </div>
        <h3 className={styles.emptyTitle}>No active promotions</h3>
        <p className={styles.emptyText}>
          Create a promo code to offer discounts to your customers and boost
          sales on your storefront.
        </p>
      </div>
    </div>
  );
}
