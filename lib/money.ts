/** Pure helpers for the "Peníze" (child real-money account) card. */
import type { MoneyAccountEntry } from "./types";

/** Balance is always derived from entries, never stored — an expense subtracts, an income adds, both stored as a positive `amount`. */
export function sumMoneyEntries(entries: Pick<MoneyAccountEntry, "type" | "amount">[]): number {
  return entries.reduce((total, e) => total + (e.type === "income" ? e.amount : -e.amount), 0);
}

export function formatMoneyCzk(amount: number): string {
  return `${amount.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč`;
}
