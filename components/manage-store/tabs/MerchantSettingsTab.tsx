"use client";

import { useState } from "react";
import type { Store, BankDetails } from "@/types/store";
import { getStoreFullUrl } from "@/lib/storeUrl";
import styles from "./tabs.module.css";

interface Props {
  store: Store;
  onSave: (updated: Store) => Promise<void>;
  onShowToast: (msg: string) => void;
  onOpenUpgradeModal?: () => void;
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

const POPULAR_BANKS = [
  "OPay",
  "Moniepoint Microfinance Bank",
  "PalmPay",
  "Kuda Bank",
  "Guaranty Trust Bank (GTBank)",
  "Access Bank",
  "Zenith Bank",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria",
  "Stanbic IBTC Bank",
  "Fidelity Bank",
  "Wema Bank / ALAT",
  "Union Bank of Nigeria",
  "Sterling Bank",
  "Ecobank Nigeria",
  "FCMB (First City Monument Bank)",
  "Polaris Bank",
  "Keystone Bank",
  "Jaiz Bank",
  "Taj Bank",
];

export default function MerchantSettingsTab({ store, onSave, onShowToast, onOpenUpgradeModal }: Props) {
  const [form, setForm] = useState({
    ...store,
    phone: store.phone || "",
    whatsapp: store.whatsapp || store.phone || "",
    bankDetails: {
      bankName: store.bankDetails?.bankName || "",
      accountNumber: store.bankDetails?.accountNumber || "",
      accountName: store.bankDetails?.accountName || "",
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  const set = (field: keyof Store, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setBank = (field: keyof BankDetails, val: string) => {
    setForm((prev) => ({
      ...prev,
      bankDetails: {
        bankName: prev.bankDetails?.bankName || "",
        accountNumber: prev.bankDetails?.accountNumber || "",
        accountName: prev.bankDetails?.accountName || "",
        [field]: val,
      },
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { onShowToast("Store name is required."); return; }
    if (!form.slug.trim()) { onShowToast("Store handle is required."); return; }

    const hasAnyBankField = Boolean(
      form.bankDetails?.bankName?.trim() ||
      form.bankDetails?.accountNumber?.trim() ||
      form.bankDetails?.accountName?.trim()
    );

    if (hasAnyBankField) {
      if (!form.bankDetails?.bankName?.trim() || !form.bankDetails?.accountNumber?.trim() || !form.bankDetails?.accountName?.trim()) {
        onShowToast("Please complete all bank fields (Bank Name, Account Number, Account Name) or clear them.");
        return;
      }
      if (form.bankDetails.accountNumber.trim().length !== 10) {
        onShowToast("NUBAN Account Number must be exactly 10 digits.");
        return;
      }
    }

    const payload: Store = {
      ...form,
      phone: form.phone?.trim() || form.whatsapp?.trim() || undefined,
      whatsapp: form.whatsapp?.trim() || form.phone?.trim() || undefined,
      bankDetails: hasAnyBankField
        ? {
            bankName: form.bankDetails.bankName.trim(),
            accountNumber: form.bankDetails.accountNumber.trim(),
            accountName: form.bankDetails.accountName.trim(),
          }
        : undefined,
    };

    setIsSaving(true);
    try {
      await onSave(payload);
    } catch (err: any) {
      onShowToast(err?.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.tabPage}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Store Settings</h2>
        <p className={styles.tabSubtitle}>Update your storefront identity, branding, contact and payout details</p>
      </div>

      {/* Domain & Plan Status */}
      <div className={styles.card} style={{ borderLeft: form.isPremium ? "4px solid #10b981" : "4px solid #f59e0b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div>
            <h3 className={styles.cardTitle} style={{ marginBottom: "2px" }}>Store Domain &amp; Plan</h3>
            <p className={styles.tabSubtitle}>Manage your public web address and subdomain status</p>
          </div>
          {form.isPremium ? (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#ecfdf5",
              color: "#059669",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.4px"
            }}>
              <span className="material-icons-round" style={{ fontSize: "16px" }}>verified</span>
              PRO SUBDOMAIN ACTIVE
            </span>
          ) : (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#fef3c7",
              color: "#d97706",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700
            }}>
              <span className="material-icons-round" style={{ fontSize: "16px" }}>info</span>
              STANDARD FREE PLAN
            </span>
          )}
        </div>

        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px"
        }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              Active Storefront URL
            </div>
            <a
              href={getStoreFullUrl(form)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#2563eb",
                textDecoration: "underline",
                wordBreak: "break-all"
              }}
            >
              {getStoreFullUrl(form)}
            </a>
          </div>

          {!form.isPremium && onOpenUpgradeModal && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(30, 27, 75, 0.25)"
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "18px", color: "#f59e0b" }}>workspace_premium</span>
              Upgrade to {form.slug || "store"}.devico.online (₦5,000)
            </button>
          )}
        </div>
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
            <span className={styles.formHint}>
              {getStoreFullUrl({ slug: form.slug || "your-handle", name: form.name || "Store" }).replace(/^https?:\/\//, "")}
            </span>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <select className={styles.selectInput} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Location (State)</label>
            <input
              type="text"
              list="tab-states-list"
              className={styles.formInput}
              value={form.location || ""}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Lagos, Nigeria"
            />
            <datalist id="tab-states-list">
              {NIGERIAN_STATES.map((state) => (
                <option key={state} value={state} />
              ))}
            </datalist>
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

      {/* Direct Contact & WhatsApp */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Contact Details</h3>
        <p className={styles.tabSubtitle} style={{ margin: "-4px 0 16px" }}>
          Buyers will receive order confirmations and communicate with you through these channels.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>WhatsApp Number *</label>
            <input
              type="tel"
              className={styles.formInput}
              value={form.whatsapp}
              onChange={(e) => {
                set("whatsapp", e.target.value);
                if (!form.phone) set("phone", e.target.value);
              }}
              placeholder="e.g. 08012345678 or 23480..."
            />
            <span className={styles.formHint}>Buyers send 1-click WhatsApp order confirmation messages to this line</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Direct Phone / Call Line</label>
            <input
              type="tel"
              className={styles.formInput}
              value={form.phone}
              onChange={(e) => {
                set("phone", e.target.value);
                if (!form.whatsapp) set("whatsapp", e.target.value);
              }}
              placeholder="e.g. 08012345678"
            />
            <span className={styles.formHint}>Primary voice contact number for customer calls</span>
          </div>
        </div>
      </div>

      {/* Payout & Direct WhatsApp Contact */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Payout &amp; Bank Transfer Details</h3>
        <p className={styles.tabSubtitle} style={{ margin: "-4px 0 16px" }}>
          Buyers who choose Direct Bank Transfer at checkout will pay directly into this nominated bank account.
        </p>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Settlement Bank Name</label>
            <input
              type="text"
              list="tab-popular-banks"
              className={styles.formInput}
              value={form.bankDetails?.bankName || ""}
              onChange={(e) => setBank("bankName", e.target.value)}
              placeholder="e.g. OPay, Moniepoint, Kuda, GTBank"
            />
            <datalist id="tab-popular-banks">
              {POPULAR_BANKS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.formInput}
              maxLength={10}
              value={form.bankDetails?.accountNumber || ""}
              onChange={(e) => setBank("accountNumber", e.target.value.replace(/\D/g, ""))}
              placeholder="10-digit NUBAN account number"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Account Name</label>
            <input
              type="text"
              className={styles.formInput}
              value={form.bankDetails?.accountName || ""}
              onChange={(e) => setBank("accountName", e.target.value)}
              placeholder="Exact name registered on this bank account"
            />
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
