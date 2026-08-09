"use client";

import { createContext, useContext } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "./firebase";
import { useAuth } from "./auth-context";
import { useFamily } from "./family-context";
import { translate, type Locale, type TranslationKey } from "./i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Wraps FamilyProvider's `member` (member.locale — see Settings' language
 * toggle) into the current UI language + a `t()` translate function, so
 * neither reads Member.locale directly nor needs to know the fallback
 * ("cs" when absent, same as every member created before this field
 * existed).
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const locale: Locale = member?.locale ?? "cs";

  function setLocale(next: Locale) {
    if (!familyId || !user) return;
    // Best-effort, no error surfaced here — a failed write just means the
    // toggle silently reverts on the next reload, low-stakes enough not to
    // need its own toast plumbing through the context.
    updateDoc(doc(getDb(), "families", familyId, "members", user.uid), { locale: next }).catch(() => {});
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: (key) => translate(locale, key) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
