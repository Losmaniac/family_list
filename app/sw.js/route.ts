// Served at /sw.js. A route handler (not a static public/ file) so the
// Firebase config — needed unconditionally at the top of the worker script,
// see below — can be inlined server-side from the same NEXT_PUBLIC_* values
// already public in the client bundle.
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const script = `// Manual service worker (no next-pwa — Turbopack builds don't support its
// webpack plugin). Handles app-shell caching for offline/installed use and
// FCM background push notifications.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Initialized unconditionally at the top level, not via a postMessage from
// the page (the previous approach) — the browser can kill and later
// respawn this worker to handle an incoming push while no page/tab is open
// to ever send that message. A freshly respawned worker that never got the
// config had no onBackgroundMessage handler at all, so the push arrived
// but nothing was ever shown. This is why background notifications
// (approvals, evening reminders) kept going missing once the app had been
// closed for a while.
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Family Quest";
  self.registration.showNotification(title, {
    body: payload.notification?.body,
    icon: "/icons/icon-192.png",
  });
});

const CACHE_NAME = "family-quest-shell-v2";
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
  // Only the app shell is ours to cache/replay offline. Third-party API
  // calls (REST Countries, Wikipedia, Open-Meteo, radio/TV lookups, …) must
  // pass through untouched — intercepting them here meant any transient
  // failure on a URL we'd never cached fell through to caches.match()
  // resolving to undefined, and respondWith(undefined) throws
  // "Returned response is null", which is what broke Zeměpis.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? Response.error()))
  );
});
`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
