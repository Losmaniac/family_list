"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Sparkles, X } from "lucide-react";
import { getDb } from "@/lib/firebase";
import type { WeeklyDigest } from "@/lib/types";

const DISMISSED_KEY = "weekly-digest-dismissed-week";

/**
 * The latest AI-written weekly recap (functions/src/weeklyDigest.ts,
 * Sunday cron) — a dismissible card at the top of Dnes. Dismissal is
 * per-week (keyed by weekStart), stored in localStorage, so it stays
 * hidden until the *next* digest is generated rather than reappearing on
 * every visit for the rest of the week.
 */
export default function WeeklyDigestBanner({ familyId }: { familyId: string }) {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const q = query(collection(getDb(), "families", familyId, "weeklyDigests"), orderBy("generatedAt", "desc"), limit(1));
    return onSnapshot(q, (snapshot) => {
      const doc = snapshot.docs[0];
      const next = doc ? (doc.data() as WeeklyDigest) : null;
      setDigest(next);
      setDismissed(next ? window.localStorage.getItem(DISMISSED_KEY) === next.weekStart : false);
    });
  }, [familyId]);

  if (!digest || dismissed) return null;

  function handleDismiss() {
    if (digest) window.localStorage.setItem(DISMISSED_KEY, digest.weekStart);
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-sm">{digest.text}</p>
      <button type="button" onClick={handleDismiss} aria-label="Skrýt" className="shrink-0 text-zinc-400 hover:text-zinc-600">
        <X size={16} />
      </button>
    </div>
  );
}
