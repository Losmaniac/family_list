"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import InvestmentsSection from "@/components/Investments";
import { findInvestmentTerm } from "@/lib/investments";
import type { Investment } from "@/lib/types";

export default function InvestmentsPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleStartInvestment(principal: number, termDays: number) {
    if (!familyId || !user) return;
    const term = findInvestmentTerm(termDays);
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Investice</h1>
      <InvestmentsSection
        investments={investments}
        xpBalance={member?.xpBalance ?? 0}
        onStart={handleStartInvestment}
        onWithdrawEarly={handleWithdrawEarly}
        submitting={submitting}
      />
    </div>
  );
}
