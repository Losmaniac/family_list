"use client";

import { createContext, useContext, useState } from "react";
import { useAuth } from "./auth-context";

export type NavStyle = "bar" | "bar-2row" | "column-left" | "column-right" | "radial";

const NAV_STYLES: readonly NavStyle[] = ["bar", "bar-2row", "column-left", "column-right", "radial"];

interface NavStyleContextValue {
  style: NavStyle;
  setStyle: (style: NavStyle) => void;
}

const NavStyleContext = createContext<NavStyleContextValue | null>(null);

function storageKey(uid: string): string {
  return `nav-style:${uid}`;
}

/**
 * Whether a member sees the bottom tab bar or the alternate floating
 * radial menu — a personal display preference (like theme), not a family
 * setting, so it lives in localStorage per uid rather than on the member
 * doc. Provided here (not read ad hoc) so the Settings page's toggle and
 * DashboardLayout's nav rendering always agree, even though they're
 * different components in the tree.
 */
export function NavStyleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [style, setStyleState] = useState<NavStyle>("bar");
  const [loadedForUid, setLoadedForUid] = useState<string | null>(null);

  // Adjust state during rendering rather than in an effect (same pattern as
  // DashboardLayout's nav-order preference) — `user` is always null during
  // SSR and the very first client render, so this never touches
  // localStorage before hydration and never causes a mismatch.
  if (user && loadedForUid !== user.uid) {
    setLoadedForUid(user.uid);
    const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey(user.uid)) : null;
    if (stored && (NAV_STYLES as string[]).includes(stored)) setStyleState(stored as NavStyle);
  }

  function setStyle(next: NavStyle) {
    setStyleState(next);
    if (user) localStorage.setItem(storageKey(user.uid), next);
  }

  return <NavStyleContext.Provider value={{ style, setStyle }}>{children}</NavStyleContext.Provider>;
}

export function useNavStyle(): NavStyleContextValue {
  const ctx = useContext(NavStyleContext);
  if (!ctx) throw new Error("useNavStyle must be used within a NavStyleProvider");
  return ctx;
}
