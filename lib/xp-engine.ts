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

export function xpForTaskCompletion(taskXpValue: number): number {
  return taskXpValue;
}

export function canAffordReward(xpBalance: number, rewardXpCost: number): boolean {
  return xpBalance >= rewardXpCost;
}

const XP_PER_LEVEL = 100;

export function levelForXp(xpBalance: number): number {
  return Math.floor(xpBalance / XP_PER_LEVEL) + 1;
}

export function xpIntoCurrentLevel(xpBalance: number): number {
  return xpBalance % XP_PER_LEVEL;
}

export function xpPerLevel(): number {
  return XP_PER_LEVEL;
}

export interface LedgerEntryInput {
  userId: string;
  delta: number;
  reason: string;
  relatedTaskId?: string;
}

export function buildLedgerEntry(input: LedgerEntryInput): Omit<XpLedgerEntry, "id"> {
  return {
    userId: input.userId,
    delta: input.delta,
    reason: input.reason,
    relatedTaskId: input.relatedTaskId,
    timestamp: Date.now(),
  };
}
