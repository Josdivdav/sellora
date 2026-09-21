"use client";

import { useState } from "react";
import styles from "./manage-store.module.css";
import type { Store } from "@/types/store";

interface EditStoreModalProps {
  store: Store;
  onClose: () => void;
  onSave: (updatedStore: Store) => void;
}

export default function EditStoreModal({
  store,
  onClose,
  onSave,
}: EditStoreModalProps) {
  const [name, setName] = useState(store.name);
  const [category, setCategory] = useState(store.category);
  const [description, setDescription] = useState(store.description);
  const [location, setLocation] = useState(store.location);
  const [deliverySpeed, setDeliverySpeed] = useState(store.deliverySpeed);
  const [badge, setBadge] = useState(store.badge || "OFFICIAL STORE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: Store = {
      ...store,
      name: name.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      deliverySpeed,
      badge: badge.trim() || undefined,
    };

    onSave(updated);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalHeaderTitle}>
            <span className="material-icons-round" style={{ color: "#4f46e5" }}>
              store
            </span>
            Edit Store Settings
          </h3>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose}>
            <span className="material-icons-round">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Store Name</label>
              <input
                type="text"
                className={styles.formInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
              />
            </div>

            <div className={styles.twoColRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Location</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Delivery Commitment</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={deliverySpeed}
                  onChange={(e) => setDeliverySpeed(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelModalBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveModalBtn}>
              Save Storefront Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
