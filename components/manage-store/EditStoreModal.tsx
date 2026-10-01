"use client";

import { useState } from "react";
import styles from "./manage-store.module.css";
import type { Store } from "@/types/store";

interface EditStoreModalProps {
  store: Store;
  onClose: () => void;
  onSave: (updatedStore: Store) => Promise<boolean | void> | void;
}

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

export default function EditStoreModal({
  store,
  onClose,
  onSave,
}: EditStoreModalProps) {
  const [name, setName] = useState(store.name || "");
  const [category, setCategory] = useState(store.category || "");
  const [description, setDescription] = useState(store.description || "");
  const [location, setLocation] = useState(store.location || "");
  const [deliverySpeed, setDeliverySpeed] = useState(store.deliverySpeed || "Ships within 24h");
  const [badge, setBadge] = useState(store.badge || "OFFICIAL STORE");
  const [logo, setLogo] = useState(store.logo || "");
  const [banner, setBanner] = useState(store.banner || "");
  const [phone, setPhone] = useState(store.phone || "");
  const [whatsapp, setWhatsapp] = useState(store.whatsapp || store.phone || "");
  const [bankName, setBankName] = useState(store.bankDetails?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(store.bankDetails?.accountNumber || "");
  const [accountName, setAccountName] = useState(store.bankDetails?.accountName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a store name.");
      return;
    }

    const hasAnyBankField = Boolean(
      bankName.trim() || accountNumber.trim() || accountName.trim()
    );

    if (hasAnyBankField) {
      if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
        setError("Please complete all bank fields (Bank Name, Account Number, and Account Name) or clear them.");
        return;
      }
      if (accountNumber.trim().length !== 10) {
        setError("NUBAN Account Number must be exactly 10 digits.");
        return;
      }
    }

    const updated: Store = {
      ...store,
      name: name.trim(),
      category: category.trim() || "General",
      description: description.trim(),
      location: location.trim(),
      deliverySpeed: deliverySpeed.trim(),
      badge: badge.trim() || undefined,
      logo: logo.trim() || store.logo,
      banner: banner.trim() || store.banner,
      phone: phone.trim() || whatsapp.trim() || undefined,
      whatsapp: whatsapp.trim() || phone.trim() || undefined,
      bankDetails:
        bankName.trim() && accountNumber.trim() && accountName.trim()
          ? {
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              accountName: accountName.trim(),
            }
          : undefined,
    };

    setIsSaving(true);
    setError("");
    try {
      await onSave(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to update store settings. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent} style={{ maxWidth: "600px" }}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle}>
            <span className="material-icons-round" style={{ color: "#4f46e5" }}>
              store
            </span>
            Edit Store Settings
          </h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} disabled={isSaving}>
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div
                style={{
                  background: "#fff1f2",
                  color: "#e11d48",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                {error}
              </div>
            )}

            {/* Storefront Identity */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Store Name *</label>
              <input
                type="text"
                className={styles.formInput}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                required
                disabled={isSaving}
              />
            </div>

            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Primary Category</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Highlight Badge</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. OFFICIAL STORE"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Store Bio / Tagline</label>
              <textarea
                className={styles.formTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSaving}
              />
            </div>

            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Location (State)</label>
                <input
                  type="text"
                  list="edit-store-states-list"
                  className={styles.formInput}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria"
                  disabled={isSaving}
                />
                <datalist id="edit-store-states-list">
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state} />
                  ))}
                </datalist>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Delivery Commitment</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={deliverySpeed}
                  onChange={(e) => setDeliverySpeed(e.target.value)}
                  placeholder="e.g. Ships within 24h"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Visual Branding URLs & Uploads */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Store Logo</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo preview"
                    style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e5e7eb", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#f3f4f6", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <span className="material-icons-round" style={{ fontSize: "20px", color: "#9ca3af" }}>storefront</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://... or upload below"
                    disabled={isSaving || isUploadingLogo}
                    style={{ marginBottom: "6px" }}
                  />
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11.5px",
                      color: isUploadingLogo ? "#9ca3af" : "#4f46e5",
                      fontWeight: 700,
                      cursor: isUploadingLogo ? "not-allowed" : "pointer",
                      background: "#eef2ff",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>cloud_upload</span>
                    {isUploadingLogo ? "Uploading Logo..." : "Upload Logo Image"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={isSaving || isUploadingLogo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingLogo(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.url) setLogo(data.url);
                        } catch (err) {
                          console.error("Logo upload error:", err);
                        } finally {
                          setIsUploadingLogo(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Store Banner Image</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {banner && (
                  <img
                    src={banner}
                    alt="Banner preview"
                    style={{ width: "100%", height: "70px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e5e7eb" }}
                  />
                )}
                <input
                  type="text"
                  className={styles.formInput}
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  placeholder="https://... or upload below"
                  disabled={isSaving || isUploadingBanner}
                />
                <div>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11.5px",
                      color: isUploadingBanner ? "#9ca3af" : "#4f46e5",
                      fontWeight: 700,
                      cursor: isUploadingBanner ? "not-allowed" : "pointer",
                      background: "#eef2ff",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>cloud_upload</span>
                    {isUploadingBanner ? "Uploading Banner..." : "Upload Banner Image"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={isSaving || isUploadingBanner}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingBanner(true);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.url) setBanner(data.url);
                        } catch (err) {
                          console.error("Banner upload error:", err);
                        } finally {
                          setIsUploadingBanner(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Direct Contact & WhatsApp */}
            <div className={styles.formSectionDivider}>
              <h4 className={styles.formSectionTitle}>
                <span className="material-icons-round" style={{ color: "#25d366", fontSize: "18px" }}>
                  chat
                </span>
                Customer Contact &amp; WhatsApp
              </h4>
              <p className={styles.formFieldHint}>
                Buyers receive order confirmation links and send payment proofs directly to this WhatsApp line.
              </p>
            </div>

            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>WhatsApp Number</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={whatsapp}
                  onChange={(e) => {
                    setWhatsapp(e.target.value);
                    if (!phone) setPhone(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. 08012345678 or 23480..."
                  disabled={isSaving}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Direct Phone / Call Line</label>
                <input
                  type="tel"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (!whatsapp) setWhatsapp(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. 08012345678"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Payout & Customer Bank Transfer Details */}
            <div className={styles.formSectionDivider}>
              <h4 className={styles.formSectionTitle}>
                <span className="material-icons-round" style={{ color: "#2563eb", fontSize: "18px" }}>
                  account_balance
                </span>
                Settlement Bank Account
              </h4>
              <p className={styles.formFieldHint}>
                When customers choose Direct Bank Transfer at checkout, funds will be transferred directly to this account.
              </p>
            </div>

            <div className={styles.formNotice}>
              <span className="material-icons-round">verified</span>
              <div>
                <strong>Direct Payout:</strong> Sellora is 100% peer-to-peer. Customers transfer directly into your nominated account with zero payment gateway fees.
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Settlement Bank Name</label>
              <input
                type="text"
                list="edit-store-popular-banks"
                className={styles.formInput}
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  setError("");
                }}
                placeholder="Select or enter bank (e.g. OPay, Moniepoint, GTBank)"
                disabled={isSaving}
              />
              <datalist id="edit-store-popular-banks">
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>10-Digit NUBAN Account Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  className={styles.formInput}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="0123456789"
                  disabled={isSaving}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Account Holder Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setError("");
                  }}
                  placeholder="Exact account name on bank file"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelModalBtn} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveModalBtn} disabled={isSaving}>
              {isSaving ? "Saving Settings..." : "Save Storefront Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
