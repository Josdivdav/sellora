"use client";

import styles from "./manage-store.module.css";
import type { Product } from "@/types/product";

interface DeleteProductModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function DeleteProductModal({
  product,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteProductModalProps) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalContent} style={{ maxWidth: "440px" }}>
        <div className={styles.deleteConfirmBox}>
          <div className={styles.deleteConfirmIcon}>
            <span className="material-icons-round">delete_forever</span>
          </div>

          <h3 className={styles.deleteConfirmTitle}>Delete This Product?</h3>
          <p className={styles.deleteConfirmDesc}>
            Are you sure you want to delete <strong>&quot;{product.name}&quot;</strong>? This item will be permanently removed from your active catalog and storefront.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelModalBtn} onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className={styles.confirmDeleteBtn} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Yes, Delete Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
