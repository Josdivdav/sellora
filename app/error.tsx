"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "@/app/home.module.css";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Sellora application error:", error);
  }, [error]);

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
            border: "1px solid #fee2e2",
            boxShadow: "0 20px 40px -15px rgba(239, 68, 68, 0.08)",
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "#fef2f2",
              color: "#ef4444",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
            }}
          >
            <span className="material-icons-round" style={{ fontSize: "36px" }}>
              error_outline
            </span>
          </div>

          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0b1230", margin: "0 0 10px" }}>
            Something Went Wrong
          </h1>

          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px", lineHeight: 1.55 }}>
            We encountered an unexpected error while loading this page. You can try refreshing or returning to the marketplace.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
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
                border: 0,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(43, 109, 255, 0.3)",
              }}
            >
              <span className="material-icons-round" style={{ fontSize: "18px" }}>
                refresh
              </span>
              Try Again
            </button>

            <Link
              href="/"
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
                home
              </span>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
