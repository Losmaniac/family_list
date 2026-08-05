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

const STREAK_BONUS_PER_DAY = 0.1;
const STREAK_BONUS_CAP = 0.5;

/** +10 % XP per consecutive streak day, capped at +50 % (1.5x base). No penalties — this only ever adds. */
export function applyStreakBonus(baseXp: number, streak: number): number {
  const bonus = Math.min(STREAK_BONUS_CAP, STREAK_BONUS_PER_DAY * Math.max(0, streak - 1));
  return Math.round(baseXp * (1 + bonus));
}

// Explicit thresholds matching the spec's example curve (L2=100, L3=250, ...,
// L6=1000, L10=2500); levels 7-9 interpolated to keep the curve smooth, and
// levels beyond 10 continue at a flat step since the spec only anchors to 10.
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2500];
const XP_PER_LEVEL_BEYOND_TABLE = 500;

const LEVEL_TITLES = [
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

export function xpForLevel(level: number): number {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * XP_PER_LEVEL_BEYOND_TABLE;
}

export function levelForXp(xpBalance: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xpBalance >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  if (xpBalance >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) {
    const overflow = xpBalance - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    level = LEVEL_THRESHOLDS.length + Math.floor(overflow / XP_PER_LEVEL_BEYOND_TABLE);
  }
  return level;
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1] ?? "Legenda rodiny";
}

export interface LevelProgress {
  level: number;
  title: string;
  intoLevel: number;
  span: number;
}

export function levelProgress(xpBalance: number): LevelProgress {
  const level = levelForXp(xpBalance);
  const floor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  return { level, title: levelTitle(level), intoLevel: xpBalance - floor, span: nextFloor - floor };
}

export interface LedgerEntryInput {
  userId: string;
  delta: number;
  reason: string;
  relatedTaskId?: string;
  note?: string;
}

export function buildLedgerEntry(input: LedgerEntryInput): Omit<XpLedgerEntry, "id"> {
  return {
    userId: input.userId,
    delta: input.delta,
    reason: input.reason,
    relatedTaskId: input.relatedTaskId,
    note: input.note,
    timestamp: Date.now(),
  };
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
