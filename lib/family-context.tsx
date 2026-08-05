"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "./firebase";
import { useAuth } from "./auth-context";
import type { Member, UserFamilyMapping } from "./types";

export interface XpGain {
  delta: number;
  key: number;
}

interface FamilyContextValue {
  loading: boolean;
  familyId: string | null;
  member: Member | null;
  /** Set whenever xpBalance ticks up (Cloud Function awarded XP); cleared by whoever renders the celebration. Purely an observation of an already-computed field, not XP math — that all still lives server-side. */
  xpGain: XpGain | null;
  clearXpGain: () => void;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [memberLoaded, setMemberLoaded] = useState(false);
  const [xpGain, setXpGain] = useState<XpGain | null>(null);
  const previousXpBalance = useRef<number | null>(null);
  const gainKey = useRef(0);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(getDb(), "users", user.uid), (snap) => {
      const mapping = snap.data() as UserFamilyMapping | undefined;
      setFamilyId(mapping?.familyId ?? null);
      setMappingLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !familyId) return;
    return onSnapshot(doc(getDb(), "families", familyId, "members", user.uid), (snap) => {
      const next = snap.exists() ? ({ id: snap.id, ...snap.data() } as Member) : null;
      setMember(next);
      setMemberLoaded(true);

      if (next && previousXpBalance.current !== null && next.xpBalance > previousXpBalance.current) {
        gainKey.current += 1;
        setXpGain({ delta: next.xpBalance - previousXpBalance.current, key: gainKey.current });
      }
      previousXpBalance.current = next?.xpBalance ?? null;
    });
  }, [user, familyId]);

  const effectiveFamilyId = user ? familyId : null;
  const effectiveMember = user && effectiveFamilyId ? member : null;
  const loading = !user ? false : !effectiveFamilyId ? !mappingLoaded : !memberLoaded;

  return (
    <FamilyContext.Provider
      value={{
        loading,
        familyId: effectiveFamilyId,
        member: effectiveMember,
        xpGain,
        clearXpGain: () => setXpGain(null),
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within a FamilyProvider");
  return ctx;
}
