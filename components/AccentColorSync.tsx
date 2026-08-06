"use client";

import { useEffect } from "react";
import { useFamily } from "@/lib/family-context";

function contrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1c1917" : "#f5f5f4";
}

/**
 * Applies a parent-chosen accent color (Settings → Vzhled) as a CSS custom
 * property override on the root element, read by --color-accent in
 * globals.css. No family accentColor set = the app's default amber, so this
 * only ever overrides, never sets the baseline.
 */
export default function AccentColorSync() {
  const { family } = useFamily();
  const accentColor = family?.accentColor;

  useEffect(() => {
    const root = document.documentElement;
    if (!accentColor) {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      return;
    }
    root.style.setProperty("--accent", accentColor);
    root.style.setProperty("--accent-foreground", contrastForeground(accentColor));
  }, [accentColor]);

  return null;
}
