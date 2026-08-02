// Manual service worker (no next-pwa — Turbopack builds don't support its
// webpack plugin). Handles app-shell caching for offline/installed use and
// FCM background push notifications.

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

const CACHE_NAME = "family-quest-shell-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Config is populated by the client right after registration (see
// lib/push.ts) since this static file has no access to Next's env vars.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "FIREBASE_CONFIG") return;
  const app = firebase.initializeApp(event.data.config);
  const messaging = firebase.messaging(app);

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? "Family Quest";
    self.registration.showNotification(title, {
      body: payload.notification?.body,
      icon: "/icons/icon-192.png",
    });
  });
});
