"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import {
  BUDGET_CATEGORIES,
  formatMoneyCzk,
  sumBudgetExpensesByCategory,
  sumMoneyEntries,
} from "@/lib/money";
import type { BudgetEntry, MoneyEntryType } from "@/lib/types";

function emptyForm() {
  return {
    type: "expense" as MoneyEntryType,
    amount: "",
    description: "",
    category: BUDGET_CATEGORIES[0],
  };
}

/**
 * "Rodinný rozpočet" — the family's own real-money household budget (rent,
 * groceries, bills, …), separate from the children's money accounts on the
 * rest of this page: no `ownerId`, just one shared ledger at
 * families/{familyId}/budgetEntries, parent-only both to read and write
 * (firestore.rules has no child-visibility exception here at all, unlike
 * moneyAccounts).
 */
export default function HouseholdBudgetPanel({
  familyId,
}: {
  familyId: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();

  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(getDb(), "families", familyId, "budgetEntries"),
      orderBy("timestamp", "desc"),
    );
    return onSnapshot(q, (snapshot) => {
      setEntries(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as BudgetEntry),
      );
    });
  }, [familyId]);

  const balance = sumMoneyEntries(entries);
  const byCategory = sumBudgetExpensesByCategory(entries);

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!user || !(amount > 0) || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "budgetEntries"), {
        type: form.type,
        amount,
        description: form.description.trim(),
        ...(form.category ? { category: form.category } : {}),
        createdBy: user.uid,
        timestamp: Date.now(),
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch {
      toast.error("Záznam se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(entry: BudgetEntry) {
    const ok = await confirm({
      title: "Smazat záznam?",
      description: `„${entry.description}“ bude odstraněn.`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(
        doc(getDb(), "families", familyId, "budgetEntries", entry.id),
      );
    } catch {
      toast.error("Záznam se nepodařilo smazat.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-border p-4">
        <PiggyBank size={28} className="shrink-0 text-accent" />
        <div>
          <p className="text-sm text-zinc-500">Zůstatek rodinného rozpočtu</p>
          <p
            className={`text-2xl font-bold ${balance < 0 ? "text-danger" : ""}`}
          >
            {formatMoneyCzk(balance)}
          </p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-zinc-500">
            Výdaje podle kategorie
          </p>
          <div className="flex flex-col gap-1">
            {byCategory.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                <span>{c.category}</span>
                <span className="font-semibold tabular-nums">
                  {formatMoneyCzk(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          <Plus size={16} /> Přidat příjem/výdaj
        </button>
      ) : (
        <form
          onSubmit={handleAddEntry}
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
            {(["income", "expense"] as MoneyEntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: t }))}
                className={`rounded-full px-4 py-1.5 ${form.type === t ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
              >
                {t === "income" ? "Příjem" : "Výdaj"}
              </button>
            ))}
          </div>
          <input
            type="text"
            required
            autoFocus
            placeholder="Popis (např. Nájem za srpen)"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <input
            type="number"
            required
            min={0.01}
            step="0.01"
            placeholder="Částka v Kč"
            value={form.amount}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, amount: e.target.value }))
            }
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          {form.type === "expense" && (
            <div className="flex flex-wrap gap-2">
              {BUDGET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, category: cat }))
                  }
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    form.category === cat
                      ? "bg-accent text-accent-foreground"
                      : "border border-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                submitting ||
                !form.description.trim() ||
                !(Number(form.amount) > 0)
              }
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
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

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">Zatím žádné záznamy.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{entry.description}</p>
                <p className="text-xs text-zinc-400">
                  {entry.category && <>{entry.category} · </>}
                  {formatDateTimeInFamilyZone(new Date(entry.timestamp))}
                </p>
              </div>
              <p
                className={`shrink-0 font-semibold tabular-nums ${entry.type === "income" ? "text-success" : "text-danger"}`}
              >
                {entry.type === "income" ? "+" : "−"}
                {formatMoneyCzk(entry.amount)}
              </p>
              <button
                type="button"
                onClick={() => handleDelete(entry)}
                aria-label="Smazat záznam"
                className="shrink-0 text-zinc-400 hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
