/**
 * Jediný zdroj pravdy pro XP logiku. Nikdy nepočítat/zapisovat XP v React komponentách.
 *
 * xpBalance je vždy odvozená hodnota ze součtu xpLedger — klient nikdy nezapisuje
 * přímo do members/{userId}.xpBalance, jinak jde XP cheatnout přes DevTools.
 */
import type { XpLedgerEntry } from "./types";

export function sumLedger(entries: Pick<XpLedgerEntry, "delta">[]): number {
  return entries.reduce((total, entry) => total + entry.delta, 0);
}

export function canAffordReward(xpBalance: number, rewardXpCost: number): boolean {
  return xpBalance >= rewardXpCost;
}

/**
 * XP is decimal-capable in the ledger/xpBalance (investments, Vzdělání, and
 * future modules can award fractional XP) but the UI only ever shows whole
 * numbers — always floored, never rounded up, so nobody sees XP they don't
 * actually have yet. Formatted with the app's number convention (space
 * thousands separator).
 */
export function formatXp(value: number): string {
  return Math.floor(value).toLocaleString("cs-CZ");
}

/**
 * Earliest moment a member's running XP total (summed in timestamp order)
 * first equalled their current balance — used to break leaderboard ties
 * ("stejné XP, kdo ho dosáhl dřív") in favor of whoever got there first,
 * even if their balance has since dipped and climbed back to the same
 * number (e.g. spent XP on a reward, then earned it back). Returns
 * undefined if the entries given never actually sum to targetBalance —
 * e.g. a caller passed a truncated/limited slice of the ledger — so the
 * tie-break can fall back to a stable order instead of a wrong one.
 */
export function earliestTimestampAtBalance(
  entries: Pick<XpLedgerEntry, "delta" | "timestamp">[],
  targetBalance: number
): number | undefined {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  let running = 0;
  for (const entry of sorted) {
    running += entry.delta;
    if (running === targetBalance) return entry.timestamp;
  }
  return undefined;
}

export const DEFAULT_STREAK_BONUS_PER_DAY = 0.1;
export const DEFAULT_STREAK_BONUS_CAP = 0.5;

/**
 * +10 % XP per consecutive streak day, capped at +50 % (1.5x base) by
 * default — no penalties, this only ever adds. A parent can override both
 * numbers per family (Settings → Herní nastavení, stored on the family doc
 * as streakBonusPerDay/streakBonusCap); callers that don't pass them get
 * the defaults, which is also what every existing test exercises.
 */
export function applyStreakBonus(
  baseXp: number,
  streak: number,
  perDay: number = DEFAULT_STREAK_BONUS_PER_DAY,
  cap: number = DEFAULT_STREAK_BONUS_CAP
): number {
  const bonus = Math.min(cap, perDay * Math.max(0, streak - 1));
  // Kept exact (not rounded) — the ledger and xpBalance are decimal-capable;
  // only the UI floors XP for display.
  return baseXp * (1 + bonus);
}

// Explicit thresholds matching the spec's example curve (L2=100, L3=250, ...,
// L6=1000, L10=2500); levels 7-9 interpolated to keep the curve smooth, and
// levels beyond 10 continue at a flat step since the spec only anchors to 10.
export const DEFAULT_LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2500];
const XP_PER_LEVEL_BEYOND_TABLE = 500;

/**
 * A parent can override how much XP levels 2-10 require (Settings → Herní
 * nastavení, stored as family.levelThresholds) — level 1 always starts at 0
 * XP by definition, never overridable, and any index missing/short in the
 * stored array falls back to the matching default, same pattern as
 * levelTitle below.
 */
function effectiveThresholds(customThresholds?: number[]): number[] {
  const base = customThresholds && customThresholds.length > 0 ? customThresholds : DEFAULT_LEVEL_THRESHOLDS;
  const resolved = DEFAULT_LEVEL_THRESHOLDS.map((fallback, i) => base[i] ?? fallback);
  resolved[0] = 0;
  return resolved;
}

export const DEFAULT_LEVEL_TITLES = [
  "Nováček",
  "Snaživec",
  "Bojovník",
  "Hrdina",
  "Mistr",
  "Šampion",
  "Legenda",
  "Ikona",
  "Vládce",
  "Velmistr",
];

export function xpForLevel(level: number, customThresholds?: number[]): number {
  const thresholds = effectiveThresholds(customThresholds);
  if (level <= thresholds.length) return thresholds[level - 1];
  return thresholds[thresholds.length - 1] + (level - thresholds.length) * XP_PER_LEVEL_BEYOND_TABLE;
}

export function levelForXp(xpBalance: number, customThresholds?: number[]): number {
  const thresholds = effectiveThresholds(customThresholds);
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xpBalance >= thresholds[i]) level = i + 1;
  }
  if (xpBalance >= thresholds[thresholds.length - 1]) {
    const overflow = xpBalance - thresholds[thresholds.length - 1];
    level = thresholds.length + Math.floor(overflow / XP_PER_LEVEL_BEYOND_TABLE);
  }
  return level;
}

/**
 * A parent can rename the ten level titles per family (Settings → Herní
 * nastavení, stored as family.levelTitles); an absent/short/empty array
 * falls back to the defaults, so a family that's only renamed a few levels
 * still gets sensible titles for the rest.
 */
export function levelTitle(level: number, customTitles?: string[]): string {
  const titles = customTitles && customTitles.length > 0 ? customTitles : DEFAULT_LEVEL_TITLES;
  return titles[Math.min(level, titles.length) - 1] ?? "Legenda rodiny";
}

export interface LevelProgress {
  level: number;
  title: string;
  intoLevel: number;
  span: number;
}

export function levelProgress(xpBalance: number, customTitles?: string[], customThresholds?: number[]): LevelProgress {
  const level = levelForXp(xpBalance, customThresholds);
  const floor = xpForLevel(level, customThresholds);
  const nextFloor = xpForLevel(level + 1, customThresholds);
  return { level, title: levelTitle(level, customTitles), intoLevel: xpBalance - floor, span: nextFloor - floor };
}

export interface LedgerEntryInput {
  userId: string;
  delta: number;
  reason: string;
  relatedTaskId?: string;
  note?: string;
}

export function buildLedgerEntry(input: LedgerEntryInput): Omit<XpLedgerEntry, "id"> {
  // The Firestore Admin SDK rejects any write containing an explicit
  // `undefined` value — relatedTaskId/note must be omitted entirely when
  // not given, never included as `key: undefined`.
  const entry: Omit<XpLedgerEntry, "id"> = {
    userId: input.userId,
    delta: input.delta,
    reason: input.reason,
    timestamp: Date.now(),
  };
  if (input.relatedTaskId !== undefined) entry.relatedTaskId = input.relatedTaskId;
  if (input.note !== undefined) entry.note = input.note;
  return entry;
}

/**
 * A manual XP adjustment always needs a second parent's approval before it
 * takes effect — one parent can't unilaterally move XP. The exception is a
 * family with only one parent: there's no second parent who could ever
 * approve it, so it auto-approves instead of sitting stuck forever.
 */
export function xpAdjustmentNeedsApproval(parentCount: number): boolean {
  return parentCount > 1;
}
