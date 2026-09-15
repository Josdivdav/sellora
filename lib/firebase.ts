import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCu1CWHjz76e0RJLtQNILFgaMKZwdY42Jo",
  authDomain: "sellora-fe391.firebaseapp.com",
  projectId: "sellora-fe391",
  storageBucket: "sellora-fe391.firebasestorage.app",
  messagingSenderId: "443835797195",
  appId: "1:443835797195:web:e32a95df2002725437954e"
};

export const app = initializeApp(firebaseConfig);