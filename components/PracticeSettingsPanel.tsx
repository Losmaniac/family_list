"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_PRACTICE_DAILY_XP_CAP } from "@/lib/practice";
import type { Member } from "@/lib/types";

export default function PracticeSettingsPanel({
  familyId,
  members,
  practiceVisibleTo,
  practiceDailyXpCap,
}: {
  familyId: string;
  members: Member[];
  practiceVisibleTo?: string[];
  practiceDailyXpCap?: number;
}) {
  const toast = useToast();
  const [visibleTo, setVisibleTo] = useState<string[]>(practiceVisibleTo ?? []);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [capInput, setCapInput] = useState(String(practiceDailyXpCap ?? DEFAULT_PRACTICE_DAILY_XP_CAP));
  const [savingCap, setSavingCap] = useState(false);

  async function toggleMember(memberId: string) {
    const next = visibleTo.includes(memberId) ? visibleTo.filter((id) => id !== memberId) : [...visibleTo, memberId];
    setVisibleTo(next);
    setSavingVisibility(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { practiceVisibleTo: next });
    } catch {
      toast.error("Nepodařilo se uložit viditelnost.");
      setVisibleTo(visibleTo); // revert
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleSaveCap() {
    const value = Number(capInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Zadej celé číslo 0 nebo víc.");
      return;
    }
    setSavingCap(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { practiceDailyXpCap: value });
      toast.success("Denní limit uložen.");
    } catch {
      toast.error("Nepodařilo se uložit denní limit.");
    } finally {
      setSavingCap(false);
    }
  }

  async function handleResetCap() {
    setSavingCap(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { practiceDailyXpCap: deleteField() });
      setCapInput(String(DEFAULT_PRACTICE_DAILY_XP_CAP));
      toast.success("Denní limit obnoven na výchozí.");
    } catch {
      toast.error("Nepodařilo se obnovit výchozí hodnotu.");
    } finally {
      setSavingCap(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">
          Kdo kromě rodičů (ti ho vidí vždy) uvidí v menu modul Vzdělání a může si v něm plnit úlohy za XP.
        </p>
        <div className="flex flex-wrap gap-2">
          {members
            .filter((m) => m.role !== "parent")
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                disabled={savingVisibility}
                className={`rounded-full px-3 py-1.5 text-sm disabled:opacity-50 ${
                  visibleTo.includes(m.id) ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {m.name}
              </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">Kolik XP nejvýš může člen za den z Vzdělání získat.</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={capInput}
            onChange={(e) => setCapInput(e.target.value)}
            className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-zinc-500">XP / den</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveCap}
            disabled={savingCap}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit
          </button>
          <button
            type="button"
            onClick={handleResetCap}
            disabled={savingCap}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Obnovit výchozí
          </button>
        </div>
      </div>
    </div>
  );
}
