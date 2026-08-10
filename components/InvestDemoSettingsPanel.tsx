"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_INVEST_DEMO_STARTING_BALANCE } from "@/lib/invest-demo";

export default function InvestDemoSettingsPanel({
  familyId,
  enabled,
  startingBalance,
}: {
  familyId: string;
  enabled: boolean;
  startingBalance?: number;
}) {
  const toast = useToast();
  const [savingToggle, setSavingToggle] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(startingBalance ?? DEFAULT_INVEST_DEMO_STARTING_BALANCE));
  const [savingBalance, setSavingBalance] = useState(false);

  async function handleToggleEnabled() {
    setSavingToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { investDemoEnabled: !enabled });
    } catch {
      toast.error("Nepodařilo se změnit nastavení demo investování.");
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleSaveBalance(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(balanceInput.replace(",", "."));
    if (!Number.isFinite(value) || value < 1000 || value > 10_000_000) {
      toast.error("Počáteční částka musí být 1 000–10 000 000 Kč.");
      return;
    }
    setSavingBalance(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { investDemoStartingBalance: Math.round(value) });
      toast.success("Počáteční částka uložena.");
    } catch {
      toast.error("Nepodařilo se uložit počáteční částku.");
    } finally {
      setSavingBalance(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} disabled={savingToggle} onChange={handleToggleEnabled} />
        Povolit demo investování (akcie, indexy, kryptoměny — nanečisto)
      </label>

      {enabled && (
        <form onSubmit={handleSaveBalance} className="flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Počáteční virtuální částka pro nový portfolio (Kč)
            <input
              type="text"
              inputMode="decimal"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={savingBalance}
            className="mt-5 shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit
          </button>
        </form>
      )}
    </div>
  );
}
