import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  
const firebaseConfig = {
  apiKey: "AIzaSyB-I_-2FrsvS2xpfndA5saY6MLVSDnu1JE",
  authDomain: "sellora-core.firebaseapp.com",
  databaseURL: "https://sellora-core-default-rtdb.firebaseio.com",
  projectId: "sellora-core",
  storageBucket: "sellora-core.firebasestorage.app",
  messagingSenderId: "835688045983",
  appId: "1:835688045983:web:858c6a0e87c6cc001bb1aa"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

//export const api = "http://127.0.0.1:5500";
//
export const api = "https://sellora-1xno.onrender.com";