"use client";

import styles from "@/app/home.module.css";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  showReset?: boolean;
}

export default function EmptyState({
  title = "No products found",
  description = "We couldn't find any products matching your active filters or search terms.",
  onReset,
  showReset = true,
}: EmptyStateProps) {
  return (
    <div className={styles.emptyStateCard} role="status" aria-live="polite">
      <div className={styles.emptyStateIcon}>
        <span className="material-icons-round">inventory_2</span>
      </div>
      <h3 className={styles.emptyStateTitle}>{title}</h3>
      <p className={styles.emptyStateText}>{description}</p>
      {showReset && onReset && (
        <div className={styles.emptyStateActions}>
          <button
            type="button"
            className={styles.emptyResetBtn}
            onClick={onReset}
          >
            <span className="material-icons-round" style={{ fontSize: "16px" }}>
              refresh
            </span>
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
