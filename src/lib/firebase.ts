import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase web config is public by design (security comes from Firebase rules).
export const firebaseConfig = {
  apiKey: "AIzaSyBvXOonu12aqBPulGeQN2TOSFcbN9yg75M",
  authDomain: "luo-acient-agent.firebaseapp.com",
  databaseURL: "https://luo-acient-agent-default-rtdb.firebaseio.com",
  projectId: "luo-acient-agent",
  storageBucket: "luo-acient-agent.firebasestorage.app",
  messagingSenderId: "811852332493",
  appId: "1:811852332493:web:b29b8db2a6c6632ef65884",
  measurementId: "G-7778VGS2QP",
};

export const ADMIN_EMAIL = "luoancientmovies40@gmail.com";

let app: FirebaseApp | undefined;
function getApp() {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}
export const fbAuth = (): Auth => getAuth(getApp());
export const fbDb = (): Firestore => getFirestore(getApp());

export function driveFileId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}
