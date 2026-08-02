import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import type { Messaging } from "firebase/messaging";

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function getFirebaseApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

// getAuth/getFirestore/getFunctions validate the config eagerly, so they must
// only ever run client-side (inside effects/handlers) — never at module
// import time, or SSR prerendering of any page breaks without real env vars.
let authInstance: Auth | null = null;
export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

let dbInstance: Firestore | null = null;
export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

let functionsInstance: Functions | null = null;
export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) functionsInstance = getFunctions(getFirebaseApp());
  return functionsInstance;
}

let messagingInstance: Messaging | null = null;
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const { isSupported, getMessaging } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  if (!messagingInstance) messagingInstance = getMessaging(getFirebaseApp());
  return messagingInstance;
}
