"use client";

import { useEffect } from "react";

/**
 * Keeps the screen awake while the app is open and visible — mainly for
 * the family dashboard view left running on a kitchen tablet/phone. Wake
 * Lock is released by the OS whenever the tab/app goes to the background,
 * so it's re-requested on every visibilitychange back to "visible" rather
 * than once at mount. Silently does nothing on browsers without support
 * (iOS Safari added it in 16.4+; older Safari just no-ops here).
 */
export default function WakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    async function requestLock() {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (e.g. low battery) or unsupported in this context — fine,
        // the app just behaves like it wasn't there.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") requestLock();
    }

    requestLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, []);

  return null;
}
