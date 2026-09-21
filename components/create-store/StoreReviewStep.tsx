"use client";

import styles from "./create-store.module.css";
import type { Store } from "@/types/store";

interface StoreReviewStepProps {
  store: Store;
  agreedToTerms: boolean;
  onToggleTerms: (val: boolean) => void;
}

export default function StoreReviewStep({
  store,
  agreedToTerms,
  onToggleTerms,
}: StoreReviewStepProps) {
  return (
    <div className={styles.formCardBody}>
      {/* Launch Readiness Summary */}
      <div className={styles.reviewChecklist}>
        <div className={styles.checkItem}>
          <span className={`material-icons-round ${styles.checkIcon}`}>check_circle</span>
          <div>
            <h4 className={styles.checkTitle}>Store Identity & Handle Configured</h4>
            <p className={styles.checkDesc}>
              <strong>{store.name}</strong> • sellora.ng/@{store.slug} ({store.category})
            </p>
          </div>
        </div>

        <div className={styles.checkItem}>
          <span className={`material-icons-round ${styles.checkIcon}`}>check_circle</span>
          <div>
            <h4 className={styles.checkTitle}>Branding & Cover Graphics Set</h4>
            <p className={styles.checkDesc}>
              Cover banner selected, store logo active, badge set to &quot;{store.badge || "Verified Merchant"}&quot;.
            </p>
          </div>
        </div>

        <div className={styles.checkItem}>
          <span className={`material-icons-round ${styles.checkIcon}`}>check_circle</span>
          <div>
            <h4 className={styles.checkTitle}>Logistics & Fulfillment Commitment</h4>
            <p className={styles.checkDesc}>
              Guaranteed {store.deliverySpeed} dispatch from {store.location}.
            </p>
          </div>
        </div>

        <div className={styles.checkItem}>
          <span className={`material-icons-round ${styles.checkIcon}`}>verified</span>
          <div>
            <h4 className={styles.checkTitle}>Verified Merchant Blue Badge Included</h4>
            <p className={styles.checkDesc}>
              Your storefront will immediately show the blue verified badge on all product listings and search cards.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Table */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #edf0f7",
          borderRadius: "14px",
          padding: "14px 18px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: "#6b7280",
            letterSpacing: "0.5px",
            marginBottom: "8px",
          }}
        >
          STOREFRONT SUMMARY
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            fontSize: "12.5px",
          }}
        >
          <div>
            <span style={{ color: "#6b7280" }}>Store Name: </span>
            <strong style={{ color: "#111827" }}>{store.name}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Category: </span>
            <strong style={{ color: "#111827" }}>{store.category}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Location: </span>
            <strong style={{ color: "#111827" }}>{store.location}</strong>
          </div>
          <div>
            <span style={{ color: "#6b7280" }}>Delivery: </span>
            <strong style={{ color: "#059669" }}>{store.deliverySpeed}</strong>
          </div>
        </div>
      </div>

      {/* Terms and conditions */}
      <label className={styles.termsBox}>
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => onToggleTerms(e.target.checked)}
        />
        <p className={styles.termsText}>
          I agree to the <strong>Sellora Merchant Terms of Service</strong>, authentic merchandise policy, and customer fulfillment standards. I understand I can update my store settings, products, and banner at any time.
        </p>
      </label>
    </div>
  );
}
