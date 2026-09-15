import { getAuth, createUserWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";

import { app } from "../lib/firebase";

const auth = getAuth(app);

export const registerWithEmailAndPassword = async (email: string, password: string, username: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const { uid, email: userEmail, displayName, photoURL } = user;

  return sendRegistrationDataToServer(
    uid,
    userEmail || "",
    displayName || username,
    photoURL || "",
  );
};

export const continueWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const user = await signInWithRedirect(auth, provider);
        return user;
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        throw error;
    }
};

async function sendRegistrationDataToServer(uid: string, email: string, displayName: string, photoURL: string) {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, email, displayName, photoURL }),
    });

    if (!response.ok) {
      throw new Error("registration/profile-save-failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error sending registration data to server:", error);
    throw error;
  }
}

export function getRegistrationErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email address. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address and try again.";
    case "auth/weak-password":
      return "Choose a stronger password and try again.";
    case "auth/network-request-failed":
      return "We couldn't reach Sellora. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. Please try again when you're ready.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists for this email. Sign in using its original method.";
    default:
      if (error instanceof Error && error.message === "registration/profile-save-failed") {
        return "We couldn't finish setting up your account. Please try again shortly.";
      }

      return "Something went wrong while creating your account. Please try again.";
  }
}
