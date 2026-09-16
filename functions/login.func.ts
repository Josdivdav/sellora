import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from "firebase/auth";

import { app } from "../lib/firebase";

const auth = getAuth(app);

export async function loginWithEmailAndPassword(
  email: string,
  password: string,
  remember: boolean,
) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  return completeLogin(userCredential.user);
}

export async function continueWithGoogle(remember: boolean) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);

  return completeLogin(userCredential.user);
}

async function completeLogin(user: User) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error === "Account profile not found"
        ? "login/profile-not-found"
        : "login/server-failed",
    );
  }

  return response.json();
}

export function getLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address and try again.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    case "auth/network-request-failed":
      return "We couldn't reach Sellora. Check your connection and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. Please try again when you're ready.";
    default:
      if (error instanceof Error && error.message === "login/profile-not-found") {
        return "We couldn't find your Sellora profile. Please create an account first.";
      }

      return "We couldn't sign you in. Please try again.";
  }
}
