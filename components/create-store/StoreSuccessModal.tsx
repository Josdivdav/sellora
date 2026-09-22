"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./create-store.module.css";
import type { Store } from "@/types/store";

interface StoreSuccessModalProps {
  store: Store;
  onClose: () => void;
}

export default function StoreSuccessModal({ store, onClose }: StoreSuccessModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const fullUrl = `https://${window.location.hostname}/@${store.slug}`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.celebrationModal}>
        <div className={styles.celebrationIconWrap}>
          <span className="material-icons-round">rocket_launch</span>
        </div>

        <h2 className={styles.celebrationTitle}>Your Storefront Is Live!</h2>
        <p className={styles.celebrationSub}>
          <strong>{store.name}</strong> is now officially registered on Sellora with verified merchant privileges. Buyers can now discover your products, follow your brand, and place direct orders.
        </p>

        <div className={styles.urlBox}>
          <span className={styles.urlText}>{fullUrl}</span>
          <button type="button" className={styles.copyUrlBtn} onClick={handleCopy}>
            <span className="material-icons-round" style={{ fontSize: "15px" }}>
              {copied ? "check" : "content_copy"}
            </span>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        <div className={styles.celebrationActions}>
          <button
            type="button"
            className={styles.viewStorefrontBtn}
            onClick={() => {
              onClose();
              router.push("/account/manage-store");
            }}
          >
            <span className="material-icons-round">inventory</span>
            Go to Manage Store & Products
          </button>

          <button
            type="button"
            className={styles.continueShoppingBtn}
            onClick={() => {
              onClose();
              router.push("/account/favorites");
            }}
          >
            View Storefront in Favorites
          </button>
        </div>
      </div>
    </div>
  );
}
