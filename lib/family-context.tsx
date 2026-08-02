"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "./firebase";
import { useAuth } from "./auth-context";
import type { Member, UserFamilyMapping } from "./types";

interface FamilyContextValue {
  loading: boolean;
  familyId: string | null;
  member: Member | null;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [memberLoaded, setMemberLoaded] = useState(false);

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
      setMember(snap.exists() ? ({ id: snap.id, ...snap.data() } as Member) : null);
      setMemberLoaded(true);
    });
  }, [user, familyId]);

  const effectiveFamilyId = user ? familyId : null;
  const effectiveMember = user && effectiveFamilyId ? member : null;
  const loading = !user ? false : !effectiveFamilyId ? !mappingLoaded : !memberLoaded;

  return (
    <FamilyContext.Provider
      value={{ loading, familyId: effectiveFamilyId, member: effectiveMember }}
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
