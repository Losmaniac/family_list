"use client";

import { useState } from "react";
import type { InvestmentTerm } from "@/lib/investments";
import type { Investment } from "@/lib/types";

const PAST_STATUS_LABELS: Record<"withdrawn" | "matured", string> = {
  withdrawn: "Vybráno předčasně",
  matured: "Vyplaceno",
};

function daysRemaining(maturesAt: number): number {
  return Math.max(0, Math.ceil((maturesAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

interface InvestmentsProps {
  investments: Investment[];
  xpBalance: number;
  terms: InvestmentTerm[];
  onStart: (principal: number, termDays: number) => void;
  onWithdrawEarly: (investment: Investment) => void;
  submitting?: boolean;
}

export default function Investments({ investments, xpBalance, terms, onStart, onWithdrawEarly, submitting }: InvestmentsProps) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(50);
  const [termDays, setTermDays] = useState(terms[0]?.days ?? 0);

  // Only show what's actually settled — an in-between state like
  // "withdrawal_requested" is a brief server-processing moment, not
  // something worth a distinct card; it just moves straight to "past"
  // once resolved. Same for "cancelled" (an investment that failed its
  // balance check at creation time never really existed from the user's
  // point of view).
  const active = investments.filter((i) => i.status === "active");
  const past = investments.filter(
    (i): i is Investment & { status: "withdrawn" | "matured" } => i.status === "matured" || i.status === "withdrawn"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0 || amount > xpBalance) return;
    onStart(amount, termDays);
    setShowForm(false);
    setAmount(50);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Zamkni si XP na čas a dostaneš víc zpátky.</p>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            + Nová investice
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500" htmlFor="investAmount">
              Kolik XP uložit
            </label>
            <input
              id="investAmount"
              type="number"
              min={1}
              max={xpBalance}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
            <span className="text-xs text-zinc-500">máš {xpBalance} XP</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <button
                key={term.days}
                type="button"
                onClick={() => setTermDays(term.days)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  termDays === term.days ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {term.label} · +{Math.round(term.rate * 100)}%
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">XP se zamkne na celou dobu — čím delší doba, tím vyšší výnos.</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || amount <= 0 || amount > xpBalance}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Investovat
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          {active.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
            >
              <div>
                <p className="font-medium">{inv.principal} XP</p>
                <p className="text-sm text-zinc-500">Běží · ještě {daysRemaining(inv.maturesAt)} dní</p>
              </div>
              <button
                type="button"
                onClick={() => onWithdrawEarly(inv)}
                className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold"
              >
                Vybrat předčasně
              </button>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          {past.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <p className="font-medium">{inv.principal} XP</p>
              <span className={`text-sm font-semibold ${inv.status === "matured" ? "text-success" : "text-zinc-500"}`}>
                {PAST_STATUS_LABELS[inv.status]} · {inv.payout ?? inv.principal} XP
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
