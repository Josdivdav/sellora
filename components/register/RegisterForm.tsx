"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/register/register.module.css";
import {
  registerWithEmailAndPassword,
  continueWithGoogle,
  getRegistrationErrorMessage,
} from "@/functions/register.func";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthDivider from "@/components/auth/AuthDivider";
import PasswordInput from "@/components/auth/PasswordInput";

export default function RegisterForm() {
  const [emailError, setEmailError] = useState(false);
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Form submit handler
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const username = (form.elements.namedItem("username") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;

    setWarning("");
    setSuccess("");
    setEmailError(false);

    if (password !== confirmPassword) {
      setWarning("Passwords do not match");
      (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerWithEmailAndPassword(email, password, username);
      router.replace("/");
      setSuccess(
        result.linkedPassword
          ? "Password added. You can now sign in with Google or your email and password."
          : "Your account has been created successfully.",
      );
    } catch (error) {
      console.log(error)
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
    setSuccess("");
    setEmailError(false);
    setIsSubmitting(true);
    try {
      await continueWithGoogle();
      router.replace("/");
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      setWarning(getRegistrationErrorMessage(error));
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
        text="or sign up with email"
      />

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

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          minLength={8}
          required
          styles={{
            fieldGroup: styles.fieldGroup,
            inputWrap: styles.inputWrap,
            passwordInput: styles.passwordInput,
            toggleVisibility: styles.toggleVisibility,
          }}
          toggleId="togglePwd"
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          minLength={8}
          required
          styles={{
            fieldGroup: styles.fieldGroup,
            inputWrap: styles.inputWrap,
            passwordInput: styles.passwordInput,
            toggleVisibility: styles.toggleVisibility,
          }}
          toggleId="toggleConfirmPwd"
        />

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

        <p className={`${styles.success} ${success ? "" : styles.hide}`} aria-live="polite">
          {success}
        </p>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
          <span className="material-icons-round">arrow_forward</span>
        </button>
      </form>
    </>
  );
}
