"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [warning, setWarning] = useState("");

  // Form submit handler
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    if (password !== confirmPassword) {
      setWarning("Passwords do not match");
      return;
    }
    // Placeholder sign-up logic
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

        {/* RIGHT FORM PANEL */}
        <div className={styles.formPanel}>
          <div className={styles.formContent}>
            <div className={styles.mobileLogo}>
              <img src="/logo.png" alt="Sellora logo" />
              <span>Sellora</span>
            </div>

            <div className={styles.formHeader}>
              <h2>Create your account</h2>
              <p>
                Already have an account? <Link href="/login">Sign in</Link>
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
              <span>or sign up with email</span>
            </div>

            <form id="signupForm" className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label htmlFor="username">Username</label>
                <div className={styles.inputWrap}>
                  <span className="material-icons-round">person_outline</span>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Choose a username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="email">Email address</label>
                <div className={styles.inputWrap}>
                  <span className="material-icons-round">mail_outline</span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                    placeholder="Create a password"
                    autoComplete="new-password"
                    minLength={8}
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

              <div className={styles.fieldGroup}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className={styles.inputWrap}>
                  <span className="material-icons-round">lock_outline</span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={8}
                    className={styles.passwordInput}
                    required
                  />
                  <span
                    className={`material-icons-round ${styles.toggleVisibility}`}
                    id="toggleConfirmPwd"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? "visibility" : "visibility_off"}
                  </span>
                </div>
              </div>

              <div className={`${styles.formMeta} ${styles.termsRow}`}>
                <label className={styles.remember}>
                  <input type="checkbox" name="terms" required />
                  I agree to the{" "}
                  <a href="#" className={styles.forgot}>
                    Terms
                  </a>{" "}
                  &amp;{" "}
                  <a href="#" className={styles.forgot}>
                    Privacy Policy
                  </a>
                </label>
              </div>

              <p className={`${styles.warn} ${warning ? "" : styles.hide}`}>
                {warning || "Email already exists"}
              </p>

              <button type="submit" className={styles.submitBtn}>
                Create Account
                <span className="material-icons-round">arrow_forward</span>
              </button>
            </form>

            <p className={styles.signupLine}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
