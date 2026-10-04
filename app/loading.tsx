import styles from "@/components/common/page-transition.module.css";

/**
 * Root Loading UI for Next.js App Router
 * Automatically rendered by Next.js when navigating to any page while server
 * components or route segments are loading/streaming.
 */
export default function Loading() {
  return (
    <div className={styles.loadingRouteContainer} aria-live="polite" aria-busy="true">
      <div className={styles.loaderCard}>
        <div className={styles.brandIconWrapper}>
          <img
            src="/favico.png"
            width="36"
            height="36"
            alt="Sellora"
            className={styles.pulseLogo}
          />
          <div className={styles.spinnerRing} />
        </div>
        <div className={styles.loadingInfo}>
          <span className={styles.loadingTitle}>Sellora</span>
          <span className={styles.loadingSubtitle}>
            Loading page<span className={styles.dots}>...</span>
          </span>
        </div>
      </div>
    </div>
  );
}
