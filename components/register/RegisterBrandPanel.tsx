import styles from "@/app/register/register.module.css";

export default function RegisterBrandPanel() {
  return (
    <div className={styles.brandPanel}>
      <div className={styles.brandContent}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Sellora logo" />
          <span className={styles.name}>Sellora</span>
        </div>

        <div className={styles.brandCopy}>
          <h1>
            Start selling
            <br />
            in minutes.
          </h1>
          <p>
            Create your free Sellora account to build your storefront, list
            products, and start accepting orders today.
          </p>
        </div>

        <div className={styles.featureList}>
          <div className={styles.featureItem}>
            <span className="material-icons-round">storefront</span>
            Build your online store in minutes
          </div>
          <div className={styles.featureItem}>
            <span className="material-icons-round">verified_user</span>
            Verified sellers build more trust
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
