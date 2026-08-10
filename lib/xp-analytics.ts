/**
 * Pure aggregation/filtering helpers for the parent-only /analytics page —
 * kept dependency-free (no Firestore) so the actual math is unit-testable
 * without a live database. The page fetches families/{familyId}/xpLedger
 * client-side (already family-readable per firestore.rules) and runs it
 * through these.
 */
import { dateKeyInFamilyZone } from "./date-utils";
import type { XpLedgerEntry } from "./types";

/**
 * Every xpLedger `reason` folds into one of these for the breakdown chart —
 * grouping by the ~16 raw reasons directly would be too many slices to
 * read or to safely color (the dataviz palette only carries 7 categorical
 * slots before CVD separation breaks down). "other" is a graceful
 * fallback for any future reason not yet added here, not something that
 * should ever actually appear.
 */
export type XpReasonCategory = "tasks" | "education" | "trivia" | "investments" | "marketplace" | "manual" | "media" | "other";

const REASON_TO_CATEGORY: Record<string, XpReasonCategory> = {
  task_completed: "tasks",
  task_reverted: "tasks",
  penalty_task: "tasks",
  adhoc_task: "tasks",
  practice_correct: "education",
  trivia_duel_won: "trivia",
  trivia_duel_lost: "trivia",
  investment_started: "investments",
  investment_matured: "investments",
  investment_withdrawn_early: "investments",
  marketplace_trade: "marketplace",
  reward_redeemed: "marketplace",
  pooled_contribution: "marketplace",
  manual_adjustment: "manual",
  radio_listening: "media",
  tv_watching: "media",
  chess_win: "education",
};

export function categoryForReason(reason: string): XpReasonCategory {
  return REASON_TO_CATEGORY[reason] ?? "other";
}

/** Fixed draw order — also the legend order — so a category's color/position never shifts as filters change which ones have data. */
export const CATEGORY_ORDER: XpReasonCategory[] = ["tasks", "education", "trivia", "investments", "marketplace", "manual", "media", "other"];

export const CATEGORY_INFO: Record<XpReasonCategory, { label: string; colorVar: string }> = {
  tasks: { label: "Úkoly", colorVar: "var(--chart-1)" },
  education: { label: "Vzdělání", colorVar: "var(--chart-2)" },
  trivia: { label: "Trivia duel", colorVar: "var(--chart-3)" },
  investments: { label: "Investice", colorVar: "var(--chart-4)" },
  marketplace: { label: "Obchod a odměny", colorVar: "var(--chart-5)" },
  manual: { label: "Ruční úpravy", colorVar: "var(--chart-6)" },
  media: { label: "Rádio a TV", colorVar: "var(--chart-7)" },
  other: { label: "Ostatní", colorVar: "var(--border)" },
};

const REASON_LABELS: Record<string, string> = {
  task_completed: "Splněný úkol",
  task_reverted: "Odebrání XP za úkol",
  penalty_task: "Penalizace",
  adhoc_task: "Jednorázový úkol",
  practice_correct: "Vzdělání — správná odpověď",
  trivia_duel_won: "Trivia duel — výhra",
  trivia_duel_lost: "Trivia duel — prohra",
  investment_started: "Vklad do investice",
  investment_matured: "Investice dozrála",
  investment_withdrawn_early: "Předčasný výběr investice",
  marketplace_trade: "Obchod mezi členy",
  reward_redeemed: "Uplatněná odměna",
  pooled_contribution: "Příspěvek do sbírky",
  manual_adjustment: "Ruční úprava rodičem",
  radio_listening: "Poslech rádia",
  tv_watching: "Sledování TV",
  chess_win: "Výhra v šachu",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

export type DateRangePreset = "7d" | "30d" | "90d" | "all" | "custom";

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  "7d": "Posledních 7 dní",
  "30d": "Posledních 30 dní",
  "90d": "Posledních 90 dní",
  all: "Vše",
  custom: "Vlastní rozsah",
};

/** ms elapsed-time window, not a calendar boundary — same convention as functions/src/weeklyDigest.ts, sidesteps family-zone/UTC conversion entirely. */
export function startMsForPreset(preset: "7d" | "30d" | "90d", now: number = Date.now()): number {
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return now - days * 24 * 60 * 60 * 1000;
}

export interface XpAnalyticsFilter {
  /** Inclusive. Undefined = no lower bound. */
  startMs?: number;
  /** Exclusive. Undefined = no upper bound. */
  endMs?: number;
  /** Undefined/empty = every member. */
  memberIds?: string[];
  /** Undefined/empty = every category. */
  categories?: XpReasonCategory[];
}

export function filterXpEntries(entries: XpLedgerEntry[], filter: XpAnalyticsFilter): XpLedgerEntry[] {
  return entries.filter((e) => {
    if (filter.startMs !== undefined && e.timestamp < filter.startMs) return false;
    if (filter.endMs !== undefined && e.timestamp >= filter.endMs) return false;
    if (filter.memberIds && filter.memberIds.length > 0 && !filter.memberIds.includes(e.userId)) return false;
    if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(categoryForReason(e.reason))) return false;
    return true;
  });
}

/** Net XP delta per member — negative deltas (penalties, manual docks) subtract same as everywhere else in the app. */
export function totalsByMember(entries: XpLedgerEntry[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of entries) totals[e.userId] = (totals[e.userId] ?? 0) + e.delta;
  return totals;
}

export function totalsByMemberAndCategory(entries: XpLedgerEntry[]): Record<string, Partial<Record<XpReasonCategory, number>>> {
  const totals: Record<string, Partial<Record<XpReasonCategory, number>>> = {};
  for (const e of entries) {
    const category = categoryForReason(e.reason);
    const forMember = (totals[e.userId] ??= {});
    forMember[category] = (forMember[category] ?? 0) + e.delta;
  }
  return totals;
}

/** Keyed by family-zone YYYY-MM-DD (lib/date-utils.ts) — for a day-by-day trend chart. */
export function totalsByDay(entries: XpLedgerEntry[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of entries) {
    const key = dateKeyInFamilyZone(new Date(e.timestamp));
    totals[key] = (totals[key] ?? 0) + e.delta;
  }
  return totals;
}
