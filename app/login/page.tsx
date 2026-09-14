"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [warning, setWarning] = useState("");

  // Form submit handler
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Placeholder sign-in logic
  }

  // Google sign-in handler
  function handleGoogleSignIn() {
    // Placeholder Google sign-in logic
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* LEFT BRAND PANEL */}
        <div className={styles.brandPanel}>
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

        {/* RIGHT FORM PANEL */}
        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2>Sign in to Sellora</h2>
            <p>
              New here? <Link href="/register">Create an account</Link>
            </p>
          </div>

          <button
            type="button"
            className={styles.googleBtn}
            id="gmailBtn"
            onClick={handleGoogleSignIn}
          >
            <img src="/google.svg" alt="Google icon" />
            Continue with Gmail
          </button>

          <div className={styles.divider}>
            <span>or sign in with email</span>
          </div>

          <form id="signinForm" className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label htmlFor="email">Email address</label>
              <div className={styles.inputWrap}>
                <span className="material-icons-round">mail_outline</span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  className={emailError ? styles.inputError : ""}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrap}>
                <span className="material-icons-round">lock_outline</span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className={styles.passwordInput}
                  required
                />
                <span
                  className={`material-icons-round ${styles.toggleVisibility}`}
                  id="togglePwd"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </div>
            </div>

            <div className={styles.formMeta}>
              <label className={styles.remember}>
                <input type="checkbox" name="remember" />
                Remember me
              </label>
              <a href="#" className={styles.forgot}>
                Forgot password?
              </a>
            </div>

            <p className={`${styles.warn} ${warning ? "" : styles.hide}`}>
              {warning || "Email already exists"}
            </p>

            <button type="submit" className={styles.submitBtn}>
              Sign In
              <span className="material-icons-round">arrow_forward</span>
            </button>
          </form>

          <p className={styles.signupLine}>
            Don&apos;t have an account? <Link href="/register">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}