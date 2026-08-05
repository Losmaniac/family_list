"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useFamily } from "@/lib/family-context";

const VISIBLE_MS = 2200;

export default function XpGainCelebration() {
  const { xpGain, clearXpGain } = useFamily();

  useEffect(() => {
    if (!xpGain) return;
    const timeout = setTimeout(clearXpGain, VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [xpGain, clearXpGain]);

  if (!xpGain) return null;

  return (
    <div
      key={xpGain.key}
      className="animate-xp-gain-pop pointer-events-none fixed left-1/2 z-50 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-lg"
      style={{ top: "calc(env(safe-area-inset-top) + 4rem)" }}
    >
      <Sparkles size={16} />+{xpGain.delta} XP
    </div>
  );
}
