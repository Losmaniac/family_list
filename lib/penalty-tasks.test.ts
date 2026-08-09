import { describe, expect, it } from "vitest";
import { computePendingPenalty, formatTimeUntil, penaltyDeadlineAt, totalPenaltyAppliedXp } from "./penalty-tasks";
import type { PenaltyTask } from "./types";

function makeTask(overrides: Partial<PenaltyTask> = {}): Pick<
  PenaltyTask,
  "createdAt" | "deadlineHours" | "penaltyXp" | "recurringXp" | "recurringIntervalHours" | "penaltiesApplied" | "status"
> {
  return {
    createdAt: 0,
    deadlineHours: 24,
    penaltyXp: 10,
    recurringXp: 5,
    recurringIntervalHours: 6,
    penaltiesApplied: 0,
    status: "pending",
    ...overrides,
  };
}

describe("penaltyDeadlineAt", () => {
  it("adds deadlineHours (in ms) to createdAt", () => {
    expect(penaltyDeadlineAt({ createdAt: 1000, deadlineHours: 2 })).toBe(1000 + 2 * 3_600_000);
  });
});

describe("computePendingPenalty", () => {
  it("owes nothing before the deadline", () => {
    const task = makeTask();
    const now = task.createdAt + 23 * 3_600_000;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 0, xpToDeduct: 0 });
  });

  it("owes just the deadline penalty right after the deadline passes", () => {
    const task = makeTask();
    const now = penaltyDeadlineAt(task) + 1;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 1, xpToDeduct: 10 });
  });

  it("owes deadline + recurring penalties after several intervals", () => {
    const task = makeTask();
    // 2 full 6h intervals past the deadline -> 1 deadline unit + 2 recurring units
    const now = penaltyDeadlineAt(task) + 13 * 3_600_000;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 3, xpToDeduct: 10 + 2 * 5 });
  });

  it("owes only the newly-elapsed units once some have already been applied", () => {
    const task = makeTask({ penaltiesApplied: 1 }); // deadline unit already applied
    const now = penaltyDeadlineAt(task) + 6 * 3_600_000; // one recurring interval elapsed
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 1, xpToDeduct: 5 });
  });

  it("owes nothing once fully caught up", () => {
    const task = makeTask({ penaltiesApplied: 3 });
    const now = penaltyDeadlineAt(task) + 13 * 3_600_000;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 0, xpToDeduct: 0 });
  });

  it("owes nothing once resolved, no matter how overdue", () => {
    const task = makeTask({ status: "resolved" });
    const now = penaltyDeadlineAt(task) + 1000 * 3_600_000;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 0, xpToDeduct: 0 });
  });

  it("never recurs when recurringIntervalHours is 0 — just the one-time deadline penalty", () => {
    const task = makeTask({ recurringIntervalHours: 0 });
    const now = penaltyDeadlineAt(task) + 100 * 3_600_000;
    expect(computePendingPenalty(task, now)).toEqual({ unitsToApply: 1, xpToDeduct: 10 });
  });
});

describe("totalPenaltyAppliedXp", () => {
  it("is 0 with no units applied", () => {
    expect(totalPenaltyAppliedXp({ penaltiesApplied: 0, penaltyXp: 10, recurringXp: 5 })).toBe(0);
  });

  it("is just the deadline penalty for one unit", () => {
    expect(totalPenaltyAppliedXp({ penaltiesApplied: 1, penaltyXp: 10, recurringXp: 5 })).toBe(10);
  });

  it("adds recurring penalties for further units", () => {
    expect(totalPenaltyAppliedXp({ penaltiesApplied: 3, penaltyXp: 10, recurringXp: 5 })).toBe(10 + 2 * 5);
  });
});

describe("formatTimeUntil", () => {
  it("formats time remaining before the deadline", () => {
    expect(formatTimeUntil(90 * 60_000)).toBe("zbývá 1h 30m");
    expect(formatTimeUntil(45 * 60_000)).toBe("zbývá 45m");
  });

  it("formats overdue time after the deadline", () => {
    expect(formatTimeUntil(-90 * 60_000)).toBe("1h 30m po termínu");
  });
});
