"use client";

import { doc, updateDoc } from "firebase/firestore";
import { firebaseConfig, getDb, getFirebaseMessaging } from "./firebase";

export type PushSetupResult = "granted" | "denied" | "unsupported";

/**
 * Registers the manual service worker, requests notification permission, and
 * saves the resulting FCM token onto the signed-in member's own doc (the
 * only field of members/{uid} a non-parent may self-write — see
 * firestore.rules). Must run from a user gesture (e.g. a button click):
 * iOS Safari silently ignores permission requests triggered on page load.
 */
export async function setupPushNotifications(
  familyId: string,
  userId: string
): Promise<PushSetupResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return "unsupported";

  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: "FIREBASE_CONFIG", config: firebaseConfig });

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const { getToken } = await import("firebase/messaging");
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  await updateDoc(doc(getDb(), "families", familyId, "members", userId), {
    fcmToken: token,
  });

  return "granted";
}
