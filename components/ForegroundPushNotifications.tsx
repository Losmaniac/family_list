"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase";

/**
 * FCM's web SDK only auto-shows a push as a real OS notification when the
 * tab isn't focused — that path goes through the service worker's
 * onBackgroundMessage (see app/sw.js/route.ts). While the app is open and
 * focused (e.g. sat on Settings testing "Testovací upozornění"), the
 * message instead arrives here in the page via onMessage and, without a
 * handler, is silently dropped — no toast, no banner, nothing, which is
 * exactly why the test notification looked like it "never arrived".
 *
 * Routing it through registration.showNotification() here — the same API
 * the service worker itself uses — makes the foreground case produce a
 * real OS-level notification too, not a custom in-app toast, so it looks
 * and behaves the same as any other app's notification, focused or not.
 */
export default function ForegroundPushNotifications() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || typeof Notification === "undefined") return;
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      const registration = await navigator.serviceWorker.ready;
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "Family Quest";
        registration.showNotification(title, {
          body: payload.notification?.body,
          icon: "/icons/icon-192.png",
        });
      });
    }
    setup();

    return () => unsubscribe?.();
  }, []);

  return null;
}
