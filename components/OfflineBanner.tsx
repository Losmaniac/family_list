"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Firestore already caches reads and queues writes while offline (see
 * getDb() in lib/firebase.ts) — this just makes that state visible, so a
 * dead zone reads as "offline, will sync" instead of looking broken.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger">
      <WifiOff size={14} />
      Offline — změny se uloží a odešlou po připojení.
    </div>
  );
}
