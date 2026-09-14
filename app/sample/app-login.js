import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, getIdToken } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { app, api } from "./assets/utils/connection.js";
const auth = await getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const email = document.getElementById("email");
const password = document.getElementById("password");
const continueWithGoogle = document.getElementById("gmailBtn");
const warn = document.querySelector(".warn");

continueWithGoogle.addEventListener("click", async () => {
  try {
    const res = await signInWithPopup(auth, provider);
    const idToken = await getIdToken(res.user);
    const result = await sendData({token: idToken}, "sign-up-gmail");
    localStorage.setItem("token", result.token);
    window.location.replace("/");
  } catch(err) {
    console.log(err);
    const code = friendlyError(err.code);
    warn.innerText = err.message || code;
    warn.classList.remove("hide");
    setTimeout(() => {
      warn.classList.add("hide");
    }, 2000);
  }
});

async function sendData(data, endpoint) {
  const res = await fetch(api+"/api/v1/auth/"+endpoint, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const response = await res.json();
  if (!res.ok) {
    throw response;
  }
  return response;
}

document.getElementById('signinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const userCredentials = await signInWithEmailAndPassword(auth, email.value, password.value);
    const token = userCredentials.user.accessToken;
    const result = await sendData({token}, "sign-in");
    localStorage.setItem("token", result.token);
    window.location.replace("/");
  } catch(err) {
    const code = friendlyError(err.code);
    if(code == "This email has been registered.") {
      warn.classList.remove("hide");
      warn.innerText = code;
      email.classList.add("error");
      email.focus();
    } else {
      warn.classList.remove("hide");
      warn.innerText = code;
    }
    setTimeout(() => {
      warn.classList.add("hide");
      email.classList.remove("error");
    }, 2000);
  }
});


function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/email-already-in-use":
      return "This email has been registered.";
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}