import styles from "@/app/login/login.module.css";

export default function LoginBrandPanel() {
  return (
    <div className={styles.brandPanel}>
      <div className={styles.brandContent}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Sellora logo" />
          <span className={styles.name}>Sellora</span>
        </div>

        <div className={styles.brandCopy}>
          <h1>
            Welcome back to
            <br />
            your storefront.
          </h1>
          <p>
            Sign in to manage your products, track orders, and keep growing
            your business — all in one place.
          </p>
        </div>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>
            <span className="material-icons-round">storefront</span>
            Build your online store in minutes
          </div>
          <div className={styles.featureItem}>
            <span className="material-icons-round">trending_up</span>
            Real-time sales & growth insights
          </div>
          <div className={styles.featureItem}>
            <span className="material-icons-round">shield</span>
            Secure, encrypted checkout
          </div>
        </div>

        <div className={styles.tagline}>Create. Sell. Grow.</div>
      </div>
    </div>
  );
}
