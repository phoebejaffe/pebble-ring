import { getAuth, type Auth } from "firebase/auth";
import { initializeApp } from "firebase/app";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const configured = Object.values(config).every(
  (value) => typeof value === "string" && value.length > 0,
);
export const firebaseAuth: Auth | null = configured ? getAuth(initializeApp(config)) : null;
export const firebaseConfigured = configured;
