"use client";

import { useState, useEffect } from "react";
import type { Store } from "@/types/store";
import type { User } from "firebase/auth";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  user?: User | null;
  onShowToast: (msg: string) => void;
}

interface Promotion {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder?: number;
  expiry?: string;
  active: boolean;
  createdAt: string;
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

export default function MerchantPromotionsTab({ store, user, onShowToast }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromoForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch promotions from database
  useEffect(() => {
    let isMounted = true;
    async function loadPromos() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/store/promotions", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPromotions(data.promotions || []);
          }
        }
      } catch (err) {
        console.error("Error loading promotions:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadPromos();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleChange = (field: keyof PromoForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      onShowToast("Authentication required.");
      return;
    }
    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      onShowToast("Please enter a promo code.");
      return;
    }
    const val = Number(form.value);
    if (!form.value || isNaN(val) || val <= 0) {
      onShowToast("Please enter a valid discount value.");
      return;
    }
    if (form.type === "percentage" && val > 100) {
      onShowToast("Percentage discount cannot exceed 100%.");
      return;
    }

    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/store/promotions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: cleanCode,
          type: form.type,
          value: val,
          minOrder: form.minOrder ? Number(form.minOrder) : undefined,
          expiry: form.expiry || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create promo code");
      }

      setPromotions((prev) => [data.promotion, ...prev]);
      setShowForm(false);
      setForm(DEFAULT_FORM);
      onShowToast(`Promo code "${cleanCode}" created successfully!`);
    } catch (err: any) {
      onShowToast(err.message || "Failed to save promo code.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/user/store/promotions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete promotion");
      }

      setPromotions((prev) => prev.filter((p) => p.id !== id));
      onShowToast(`Deleted promo code "${code}".`);
    } catch (err: any) {
      onShowToast(err.message || "Failed to delete promo code");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      onShowToast(`Copied promo code: ${code}`);
    }
  };

  return (
    <div className={styles.tabPage}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.tabTitle}>Promotions &amp; Discounts</h2>
          <p className={styles.tabSubtitle}>Create database discount codes for {store.name} customers</p>
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
                placeholder="e.g. SUMMER25"
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
                onChange={(e) => handleChange("type", e.target.value as "percentage" | "fixed")}
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
                min={1}
                max={form.type === "percentage" ? 100 : undefined}
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
              {isSaving ? "Saving to Database..." : "Save Promo Code"}
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

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <span className="material-icons-round" style={{ fontSize: "28px", animation: "spin 1s linear infinite" }}>
            sync
          </span>
          <p style={{ marginTop: "6px", fontSize: "13px" }}>Loading promotions from database...</p>
        </div>
      )}

      {/* Promos Grid */}
      {!isLoading && promotions.length > 0 && (
        <div className={styles.promosGrid}>
          {promotions.map((promo) => {
            const isDeleting = deletingId === promo.id;
            return (
              <div key={promo.id} className={styles.promoCardItem}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className={styles.promoCodeBadge}>
                    <span className="material-icons-round" style={{ fontSize: "16px" }}>
                      local_offer
                    </span>
                    {promo.code}
                  </div>
                  <span className={styles.promoDiscountVal}>
                    {promo.type === "percentage" ? `${promo.value}% OFF` : `₦${promo.value.toLocaleString()} OFF`}
                  </span>
                </div>

                <div className={styles.promoMetaRow}>
                  {promo.minOrder ? (
                    <span>Min. Order: ₦{promo.minOrder.toLocaleString()}</span>
                  ) : (
                    <span>No minimum spend</span>
                  )}
                  {promo.expiry ? (
                    <span>Expires: {new Date(promo.expiry).toLocaleDateString()}</span>
                  ) : (
                    <span>Never expires</span>
                  )}
                </div>

                <div className={styles.promoCardFooter}>
                  <button
                    type="button"
                    className={styles.copyIconBtn}
                    onClick={() => handleCopyCode(promo.code)}
                  >
                    <span className="material-icons-round" style={{ fontSize: "15px" }}>
                      content_copy
                    </span>
                    Copy Code
                  </button>

                  <button
                    type="button"
                    className={styles.deleteIconBtn}
                    disabled={isDeleting}
                    onClick={() => handleDelete(promo.id, promo.code)}
                    title="Delete promo code"
                  >
                    <span className="material-icons-round" style={{ fontSize: "18px" }}>
                      {isDeleting ? "hourglass_empty" : "delete"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && promotions.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <span className="material-icons-round">local_offer</span>
          </div>
          <h3 className={styles.emptyTitle}>No active promotions</h3>
          <p className={styles.emptyText}>
            Create a promo code to offer discounts to your customers and boost
            sales on your storefront. All codes are backed by your store database.
          </p>
        </div>
      )}
    </div>
  );
}
