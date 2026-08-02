"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline app-shell caching is a nice-to-have — ignore registration failures.
      });
    }
  }, []);

  return null;
}
