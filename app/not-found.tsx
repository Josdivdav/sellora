import Link from "next/link";
import styles from "@/app/home.module.css";

export const metadata = {
  title: "404 — Page Not Found | Sellora",
  description: "The page or store you are looking for does not exist on Sellora.",
};

export default function NotFound() {
  return (
    <div className={styles.page} style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header className={styles.header} style={{ maxWidth: "1200px", width: "95%", margin: "10px auto" }}>
        <Link href="/" className={styles.logoLink} title="Sellora — Home">
          <div className={styles.logo}>
            <img src="/favico.png" width="35" height="35" alt="Sellora icon" />
            <img src="/logo-text.png" width="75" height="26" alt="Sellora logo" />
          </div>
        </Link>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px -15px rgba(11, 18, 48, 0.08)",
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "#edf3ff",
              color: "#2b6dff",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
            }}
          >
            <span className="material-icons-round" style={{ fontSize: "36px" }}>
              storefront
            </span>
          </div>

          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0b1230", margin: "0 0 10px" }}>
            404 — Page Not Found
          </h1>

          <p style={{ fontSize: "14.5px", color: "#64748b", margin: "0 0 28px", lineHeight: 1.55 }}>
            The item, merchant store, or page you are looking for does not exist, has changed addresses, or is currently unavailable.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2b6dff, #7b2ff7)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(43, 109, 255, 0.3)",
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                explore
              </span>
              Explore Marketplace
            </Link>

            <Link
              href="/cart"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                shopping_cart
              </span>
              View Cart
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
