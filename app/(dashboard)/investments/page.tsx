"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { logAction } from "@/lib/audit-log";
import InvestmentsSection from "@/components/Investments";
import FamilyInvestmentsOverview from "@/components/FamilyInvestmentsOverview";
import { effectiveInvestmentTerms, findTermInList } from "@/lib/investments";
import type { Investment, Member } from "@/lib/types";

export default function InvestmentsPage() {
  const { user } = useAuth();
  const { familyId, member, family } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const terms = effectiveInvestmentTerms(family?.investmentTerms);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [familyInvestments, setFamilyInvestments] = useState<Investment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!familyId || !user) return;
    const investmentsQuery = query(
      collection(getDb(), "families", familyId, "investments"),
      where("userId", "==", user.uid),
      orderBy("startedAt", "desc"),
      limit(20)
    );
    return onSnapshot(investmentsQuery, (snapshot) => {
      setInvestments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Investment));
    });
  }, [familyId, user]);

  // Overview of every member's investments, for parents — everyone's
  // investments docs are already readable by any family member (see
  // firestore.rules), this just surfaces them in one place instead of each
  // parent only ever seeing their own.
  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    return onSnapshot(collection(getDb(), "families", familyId, "investments"), (snapshot) => {
      setFamilyInvestments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Investment));
    });
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId, member?.role]);

  async function handleStartInvestment(principal: number, termDays: number) {
    if (!familyId || !user) return;
    const term = findTermInList(terms, termDays);
    if (!term) return;
    setSubmitting(true);
    try {
      const now = Date.now();
      await addDoc(collection(getDb(), "families", familyId, "investments"), {
        userId: user.uid,
        principal,
        rate: term.rate,
        termDays: term.days,
        startedAt: now,
        maturesAt: now + term.days * 24 * 60 * 60 * 1000,
        status: "active",
      });
      toast.success(`${principal} XP uloženo na ${term.label}.`);
    } catch {
      toast.error("Investici se nepodařilo založit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdrawEarly(investment: Investment) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "investments", investment.id), {
        status: "withdrawal_requested",
      });
      toast.success("Investice se předčasně vybírá — úrok propadá.");
    } catch {
      toast.error("Nepodařilo se vybrat investici.");
    }
  }

  async function handleDeleteInvestment(investment: Investment) {
    if (!familyId || !user) return;
    const ok = await confirm({
      title: "Smazat tuto investici?",
      description: "Jde jen o starý záznam v historii — XP z něj bylo už dávno vyplaceno. Tuto akci nelze vrátit zpět.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    // Optimistic — don't wait on the onSnapshot round-trip to reflect the
    // delete, it should disappear the instant the parent confirms it.
    setInvestments((prev) => prev.filter((i) => i.id !== investment.id));
    setFamilyInvestments((prev) => prev.filter((i) => i.id !== investment.id));
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "investments", investment.id));
      logAction(familyId, user.uid, "investment_deleted", `${investment.principal} XP`);
      toast.success("Investice byla smazána.");
    } catch {
      toast.error("Investici se nepodařilo smazat.");
      setInvestments((prev) => (prev.some((i) => i.id === investment.id) ? prev : [...prev, investment]));
      setFamilyInvestments((prev) => (prev.some((i) => i.id === investment.id) ? prev : [...prev, investment]));
    }
  }

  if (family?.investmentsEnabled === false) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Investice</h1>
        <p className="text-zinc-500">Investice jsou v této rodině vypnuté. Zapnout je může rodič v Nastavení.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Investice</h1>
      <InvestmentsSection
        investments={investments}
        xpBalance={member?.xpBalance ?? 0}
        terms={terms}
        onStart={handleStartInvestment}
        onWithdrawEarly={handleWithdrawEarly}
        submitting={submitting}
        canDeletePast={member?.role === "parent"}
        onDeletePast={handleDeleteInvestment}
      />
      {member?.role === "parent" && (
        <FamilyInvestmentsOverview members={members} investments={familyInvestments} />
      )}
    </div>
  );
}
