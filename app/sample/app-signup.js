import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, getIdToken } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import { app, api } from "../../assets/utils/connection.js";
const auth = await getAuth(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const username = document.getElementById("username");
const email = document.getElementById("email");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
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
    const code = friendlyError(err.code);
    warn.innerText = code;
    warn.classList.remove("hide");
    setTimeout(() => {
      warn.classList.add("hide");
    }, 2000);
  }
})

async function sendData(data, endpoint) {
  const res = await fetch(api+"/api/v1/auth/"+endpoint, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const response = await res.json();
  if(!res.ok) {
    throw response;
  }
  return response;
}

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (password.value !== confirmPassword.value) {
    document.getElementById('confirmPassword').focus();
    return;
  }
  confirmPassword.blur();
  password.blur();
  try {
    const res = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const result = await sendData({token: res.user.accessToken, username: username.value}, "sign-up");
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