"use client";

import { useEffect, useMemo, useState } from "react";
import { useFamily } from "@/lib/family-context";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444"];
const PARTICLE_COUNT = 28;
const VISIBLE_MS = 1100;

interface Particle {
  angle: number;
  distance: number;
  duration: number;
  color: string;
  size: number;
}

function buildBurst(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    angle: Math.random() * 360,
    distance: 90 + Math.random() * 110,
    duration: 0.7 + Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 5 + Math.random() * 5,
  }));
}

/** A brief confetti burst from screen center whenever a task completion awards XP — shares the same signal XpGainCelebration reacts to, just a bigger visual moment. */
export default function TaskCompleteFireworks() {
  const { xpGain } = useFamily();
  const [hiddenKey, setHiddenKey] = useState<number | null>(null);
  const particles = useMemo(() => (xpGain ? buildBurst() : []), [xpGain]);

  useEffect(() => {
    if (!xpGain) return;
    const timeout = setTimeout(() => setHiddenKey(xpGain.key), VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [xpGain]);

  if (!xpGain || xpGain.key === hiddenKey) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="animate-firework-particle absolute top-1/2 left-1/2 rounded-full"
          style={
            {
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              "--angle": `${p.angle}deg`,
              "--distance": `${p.distance}px`,
              "--duration": `${p.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
