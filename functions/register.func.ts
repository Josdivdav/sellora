import {
  EmailAuthProvider,
  getAuth,
  createUserWithEmailAndPassword,
  linkWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import { app } from "../lib/firebase";

const auth = getAuth(app);

export const registerWithEmailAndPassword = async (email: string, password: string, username: string) => {
  const signedInUser = auth.currentUser;

  if (signedInUser) {
    if (signedInUser.email?.toLowerCase() !== email.toLowerCase()) {
      throw { code: "registration/different-user-signed-in" };
    }

    const hasPasswordSignIn = signedInUser.providerData.some(
      (provider) => provider.providerId === "password",
    );

    if (!hasPasswordSignIn) {
      const userCredential = await linkWithCredential(
        signedInUser,
        EmailAuthProvider.credential(email, password),
      );
      const user = userCredential.user;
      const registration = await sendRegistrationDataToServer(
        user.uid,
        user.email || email,
        user.displayName || username,
        user.photoURL || "",
        await user.getIdToken(),
      );

      return { ...registration, linkedPassword: true };
    }
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const { uid, email: userEmail, displayName, photoURL } = user;

  return await sendRegistrationDataToServer(
    uid,
    userEmail || "",
    displayName || username,
    photoURL || "",
    await user.getIdToken(),
  );
};

export const continueWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;
        const { uid, email: userEmail, displayName, photoURL } = user;

        return await sendRegistrationDataToServer(
          uid,
          userEmail || "",
          displayName || userEmail?.split("@")[0] || "Sellora user",
          photoURL || "",
          await user.getIdToken(),
        );
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        throw error;
    }
};


async function sendRegistrationDataToServer(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  idToken: string,
) {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ uid, email, displayName, photoURL }),
    });

    if (!response.ok) {
      throw new Error("registration/profile-save-failed");
    }

    const data = await response.json();
    console.log(data)
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
    case "auth/provider-already-linked":
      return "This account already has an email and password sign-in method.";
    case "registration/different-user-signed-in":
      return "You are signed in with another account. Sign out before creating a new one.";
    default:
      if (error instanceof Error && error.message === "registration/profile-save-failed") {
        return "We couldn't finish setting up your account. Please try again shortly.";
      }

      return "Something went wrong while creating your account. Please try again.";
  }
}
