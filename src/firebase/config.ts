import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtY8SluJCh8DgPQOc_Vh6q9xynE3kNP40",
  authDomain: "give-and-take-4d7d2.firebaseapp.com",
  projectId: "give-and-take-4d7d2",
  storageBucket: "give-and-take-4d7d2.firebasestorage.app",
  messagingSenderId: "341419249481",
  appId: "1:341419249481:web:296a6f4ec5a9644c445498"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);