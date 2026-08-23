/** Pure helpers for the "Peníze" (child real-money account) card and the household budget panel. */
import type { BudgetEntry, MoneyAccountEntry } from "./types";

/** Balance is always derived from entries, never stored — an expense subtracts, an income adds, both stored as a positive `amount`. Structurally works for BudgetEntry too, same type/amount shape. */
export function sumMoneyEntries(entries: Pick<MoneyAccountEntry, "type" | "amount">[]): number {
  return entries.reduce((total, e) => total + (e.type === "income" ? e.amount : -e.amount), 0);
}

export function formatMoneyCzk(amount: number): string {
  return `${amount.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč`;
}

/** Suggested starter categories for the household budget's add-entry form — free-form field, not an enum, so a parent isn't blocked by a missing category. */
export const BUDGET_CATEGORIES = ["Bydlení", "Jídlo", "Doprava", "Zdraví", "Zábava", "Ostatní"];

/** Total expense amount per category, highest first — categoryless expenses group under "Bez kategorie". Only expenses count (income has no category breakdown to show). */
export function sumBudgetExpensesByCategory(entries: Pick<BudgetEntry, "type" | "amount" | "category">[]): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense") continue;
    const key = e.category?.trim() || "Bez kategorie";
    totals.set(key, (totals.get(key) ?? 0) + e.amount);
  }
  return [...totals.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}
