/** Pure helpers for "Postihové úkoly" (deadline-with-automatic-XP-loss tasks). */
import type { PenaltyTask } from "./types";

export interface PenaltyDue {
  unitsToApply: number;
  xpToDeduct: number;
}

/** Timestamp the first (deadline-miss) penalty becomes due. */
export function penaltyDeadlineAt(task: Pick<PenaltyTask, "createdAt" | "deadlineHours">): number {
  return task.createdAt + task.deadlineHours * 3_600_000;
}

/**
 * How many penalty units (1 for the missed deadline, plus one per fully
 * elapsed recurringIntervalHours since then) are due as of `now`, beyond
 * what's already recorded in `penaltiesApplied` — and how much XP that
 * represents. Pure so the same math drives both the server-side sweep
 * that actually deducts XP and the client's live "-X XP so far" display.
 * Resolved tasks never owe anything, regardless of elapsed time.
 */
export function computePendingPenalty(
  task: Pick<
    PenaltyTask,
    "createdAt" | "deadlineHours" | "penaltyXp" | "recurringXp" | "recurringIntervalHours" | "penaltiesApplied" | "status"
  >,
  now: number = Date.now()
): PenaltyDue {
  if (task.status !== "pending") return { unitsToApply: 0, xpToDeduct: 0 };
  const deadlineAt = penaltyDeadlineAt(task);
  if (now < deadlineAt) return { unitsToApply: 0, xpToDeduct: 0 };

  const recurringUnits =
    task.recurringIntervalHours > 0 ? Math.floor((now - deadlineAt) / (task.recurringIntervalHours * 3_600_000)) : 0;
  const totalUnitsDue = 1 + recurringUnits;
  const unitsToApply = Math.max(0, totalUnitsDue - task.penaltiesApplied);
  if (unitsToApply === 0) return { unitsToApply: 0, xpToDeduct: 0 };

  // The very first unit ever applied to a task is the deadline-miss
  // penalty (penaltyXp); every unit after that is a recurring one
  // (recurringXp) — which of those this batch covers depends on how many
  // units (if any) were already applied before this call.
  const firstUnitIsDeadline = task.penaltiesApplied === 0;
  const xpToDeduct = firstUnitIsDeadline
    ? task.penaltyXp + Math.max(0, unitsToApply - 1) * task.recurringXp
    : unitsToApply * task.recurringXp;

  return { unitsToApply, xpToDeduct };
}

/** Total XP already deducted for this task so far, from penaltiesApplied alone. */
export function totalPenaltyAppliedXp(
  task: Pick<PenaltyTask, "penaltiesApplied" | "penaltyXp" | "recurringXp">
): number {
  if (task.penaltiesApplied === 0) return 0;
  return task.penaltyXp + (task.penaltiesApplied - 1) * task.recurringXp;
}

/** "zbývá 1h 30m" / "45m po termínu" style label for a signed ms offset from the deadline. */
export function formatTimeUntil(ms: number): string {
  const overdue = ms < 0;
  const totalMinutes = Math.round(Math.abs(ms) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return overdue ? `${label} po termínu` : `zbývá ${label}`;
}
