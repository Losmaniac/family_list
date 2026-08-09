"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.update())
      .catch(() => {
        // Offline app-shell caching is a nice-to-have — ignore registration failures.
      });

    // sw.js ships with skipWaiting()+clients.claim(), so a new deploy takes
    // over immediately once installed — but without this, the page a user
    // already has open keeps running under the OLD worker's fetch handler
    // until they manually close and reopen the app. Reloading once the new
    // worker actually takes control picks up a fix (like this one) right
    // away instead of leaving it looking un-deployed.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  return null;
}
