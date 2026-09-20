"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/login/login.module.css";
import {
  continueWithGoogle,
  getLoginErrorMessage,
  loginWithEmailAndPassword,
} from "@/functions/login.func";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthDivider from "@/components/auth/AuthDivider";
import PasswordInput from "@/components/auth/PasswordInput";

export default function LoginForm() {
  const [emailError, setEmailError] = useState(false);
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const rememberMe = (form.elements.namedItem("remember") as HTMLInputElement).checked;

    setWarning("");
    setEmailError(false);
    setIsSubmitting(true);
    try {
      await loginWithEmailAndPassword(email, password, rememberMe);
      router.replace("/");
    } catch (error) {
      setWarning(getLoginErrorMessage(error));
      setEmailError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Google sign-in handler
  async function handleGoogleSignIn() {
    setWarning("");
    setEmailError(false);
    setIsSubmitting(true);
    try {
      await continueWithGoogle(remember);
      router.replace("/");
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setWarning(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <GoogleButton
        className={styles.googleBtn}
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
      />

      <AuthDivider
        className={styles.divider}
        text="or sign in with email"
      />

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
              autoComplete="email"
              onChange={() => {
                setEmailError(false);
                setWarning("");
              }}
              required
            />
          </div>
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          styles={{
            fieldGroup: styles.fieldGroup,
            inputWrap: styles.inputWrap,
            passwordInput: styles.passwordInput,
            toggleVisibility: styles.toggleVisibility,
          }}
          toggleId="togglePwd"
        />

        <div className={styles.formMeta}>
          <label className={styles.remember}>
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember me
          </label>
          <a href="#" className={styles.forgot}>
            Forgot password?
          </a>
        </div>

        <p
          className={`${styles.warn} ${warning ? "" : styles.hide}`}
          role="alert"
          aria-live="assertive"
        >
          {warning}
        </p>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
          <span className="material-icons-round">arrow_forward</span>
        </button>
      </form>
    </>
  );
}
