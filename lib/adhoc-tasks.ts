/** Pure helpers for "Jednorázové úkoly" (ad-hoc, on-demand tasks with a per-type cooldown). */
import type { AdHocTaskCompletion } from "./types";

export interface AdHocCooldownInfo {
  onCooldown: boolean;
  remainingMs: number;
  readyAt: number | null;
}

/**
 * Whether a task type is still cooling down at `now`, given its cooldown
 * length and when it was last completed (family-wide, not per-member — the
 * dishwasher doesn't need re-emptying just because a different sibling
 * would be the one doing it next).
 */
export function adHocCooldownInfo(
  cooldownMinutes: number,
  lastCompletedAt: number | undefined,
  now: number = Date.now()
): AdHocCooldownInfo {
  if (!lastCompletedAt || cooldownMinutes <= 0) return { onCooldown: false, remainingMs: 0, readyAt: null };
  const readyAt = lastCompletedAt + cooldownMinutes * 60_000;
  const remainingMs = Math.max(0, readyAt - now);
  return { onCooldown: remainingMs > 0, remainingMs, readyAt };
}

/** Most recent completion timestamp per task type, from a list of completions in any order. */
export function latestCompletionByType(
  completions: Pick<AdHocTaskCompletion, "typeId" | "timestamp">[]
): Record<string, number> {
  const latest: Record<string, number> = {};
  for (const c of completions) {
    if (!latest[c.typeId] || c.timestamp > latest[c.typeId]) latest[c.typeId] = c.timestamp;
  }
  return latest;
}

/** "2h 5m" / "12m 03s" / "45s" countdown label for a remaining cooldown duration. */
export function formatCooldownRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

/** "2 h" / "30 min" / "1 h 30 min" label for a cooldown *length* (as configured, not counting down). */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
