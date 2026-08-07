"use client";

import { doc, updateDoc } from "firebase/firestore";
import { getDb, getFirebaseMessaging } from "./firebase";

export type PushSetupResult = "granted" | "denied" | "unsupported";

/**
 * iOS Safari only ever delivers Web Push to a PWA that's been added to the
 * home screen — inside a normal browser tab, Notification permission can be
 * granted but nothing ever actually arrives, with no error to tell the user
 * why. Surfacing this distinction lets Settings guide them to install first
 * instead of silently failing.
 */
export function isIosNotStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

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
