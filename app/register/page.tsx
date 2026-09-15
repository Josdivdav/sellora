"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";
import {
  registerWithEmailAndPassword,
  continueWithGoogle,
  getRegistrationErrorMessage,
} from "@/functions/register.func";

import { getAuth, getRedirectResult, GoogleAuthProvider } from "firebase/auth";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form submit handler
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const username = (form.elements.namedItem("username") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    setWarning("");
    setEmailError(false);

    if (password !== confirmPassword) {
      setWarning("Passwords do not match");
      (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithEmailAndPassword(email, password, username);
    } catch (error) {
      const message = getRegistrationErrorMessage(error);
      setWarning(message);

      const isEmailError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-email");

      if (isEmailError) {
        setEmailError(true);
        (form.elements.namedItem("email") as HTMLInputElement)?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setWarning("");
    setEmailError(false);
    setIsSubmitting(true);
    try {
      await continueWithGoogle();
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setWarning(getRegistrationErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    const auth = getAuth();
    getRedirectResult(auth)
      .then((result) => {
        if (!result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        const user = result.user;
        console.log(user);
      })
      .catch((error) => {
        console.error("Error completing Google sign-in:", error);
        setWarning(getRegistrationErrorMessage(error));
      });
  }, []);

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
              disabled={isSubmitting}
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
                    onChange={() => {
                      setEmailError(false);
                      setWarning("");
                    }}
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

              <p
                className={`${styles.warn} ${warning ? "" : styles.hide}`}
                role="alert"
                aria-live="assertive"
              >
                {warning}
              </p>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create Account"}
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
