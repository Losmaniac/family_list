import { describe, expect, it } from "vitest";
import {
  applyStreakBonus,
  buildLedgerEntry,
  canAffordReward,
  earliestTimestampAtBalance,
  levelForXp,
  levelProgress,
  levelTitle,
  sumLedger,
  xpAdjustmentNeedsApproval,
  xpForLevel,
} from "./xp-engine";

describe("sumLedger", () => {
  it("adds up deltas, positive and negative", () => {
    expect(sumLedger([{ delta: 10 }, { delta: -5 }, { delta: 3 }])).toBe(8);
  });

  it("returns 0 for an empty ledger", () => {
    expect(sumLedger([])).toBe(0);
  });
});

describe("earliestTimestampAtBalance", () => {
  it("finds the first time the running total hits the target", () => {
    const entries = [
      { delta: 10, timestamp: 100 },
      { delta: 10, timestamp: 200 },
      { delta: 10, timestamp: 300 },
    ];
    expect(earliestTimestampAtBalance(entries, 20)).toBe(200);
  });

  it("returns the earliest hit even if the balance dips and returns to it later", () => {
    const entries = [
      { delta: 20, timestamp: 100 }, // running: 20 — first time at 20
      { delta: -15, timestamp: 200 }, // running: 5
      { delta: 15, timestamp: 300 }, // running: 20 again — should not win
    ];
    expect(earliestTimestampAtBalance(entries, 20)).toBe(100);
  });

  it("is order-independent — sorts by timestamp itself", () => {
    const entries = [
      { delta: 10, timestamp: 300 },
      { delta: 10, timestamp: 100 },
      { delta: 10, timestamp: 200 },
    ];
    expect(earliestTimestampAtBalance(entries, 20)).toBe(200);
  });

  it("returns undefined when the entries never actually sum to the target", () => {
    const entries = [{ delta: 5, timestamp: 100 }];
    expect(earliestTimestampAtBalance(entries, 20)).toBeUndefined();
  });

  it("returns undefined for an empty ledger, even when the target is 0", () => {
    expect(earliestTimestampAtBalance([], 0)).toBeUndefined();
  });
});

describe("canAffordReward", () => {
  it("allows exact balance", () => {
    expect(canAffordReward(50, 50)).toBe(true);
  });

  it("rejects insufficient balance", () => {
    expect(canAffordReward(49, 50)).toBe(false);
  });
});

describe("applyStreakBonus", () => {
  it("gives no bonus on day 1 of a streak", () => {
    expect(applyStreakBonus(100, 1)).toBe(100);
  });

  it("gives +10% per additional consecutive day", () => {
    expect(applyStreakBonus(100, 2)).toBe(110);
    expect(applyStreakBonus(100, 3)).toBe(120);
  });

  it("caps the bonus at +50%, however long the streak", () => {
    expect(applyStreakBonus(100, 6)).toBe(150);
    expect(applyStreakBonus(100, 20)).toBe(150);
    expect(applyStreakBonus(100, 365)).toBe(150);
  });

  it("never reduces XP even for a streak of 0", () => {
    expect(applyStreakBonus(100, 0)).toBe(100);
  });
});

describe("xpForLevel / levelForXp", () => {
  it("matches the spec's example thresholds", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(6)).toBe(1000);
    expect(xpForLevel(10)).toBe(2500);
  });

  it("is the inverse of xpForLevel at each threshold", () => {
    for (let level = 1; level <= 10; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
    }
  });

  it("stays at the lower level just below a threshold", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(249)).toBe(2);
  });

  it("keeps growing at a flat step past the table's top", () => {
    expect(levelForXp(2500)).toBe(10);
    expect(levelForXp(3000)).toBe(11);
    expect(levelForXp(3500)).toBe(12);
  });

  it("never returns a level below 1, even for 0 or negative XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-100)).toBe(1);
  });
});

describe("levelProgress", () => {
  it("reports progress within the current level", () => {
    const progress = levelProgress(150); // level 2 starts at 100, level 3 at 250
    expect(progress.level).toBe(2);
    expect(progress.intoLevel).toBe(50);
    expect(progress.span).toBe(150);
  });
});

describe("levelTitle", () => {
  it("gives a distinct title for early levels", () => {
    expect(levelTitle(1)).toBe("Nováček");
    expect(levelTitle(10)).toBe("Velmistr");
  });

  it("falls back to a generic title past the named levels", () => {
    expect(levelTitle(50)).toBe("Velmistr");
  });
});

describe("buildLedgerEntry", () => {
  it("carries through the given fields and stamps a timestamp", () => {
    const before = Date.now();
    const entry = buildLedgerEntry({ userId: "u1", delta: 10, reason: "task_completed", relatedTaskId: "t1" });
    expect(entry.userId).toBe("u1");
    expect(entry.delta).toBe(10);
    expect(entry.reason).toBe("task_completed");
    expect(entry.relatedTaskId).toBe("t1");
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
  });

  it("carries through an optional note", () => {
    const entry = buildLedgerEntry({ userId: "u1", delta: -20, reason: "manual_adjustment", note: "Za drzost" });
    expect(entry.note).toBe("Za drzost");
  });

  it("omits relatedTaskId/note entirely when not given, rather than including them as undefined", () => {
    // The Firestore Admin SDK throws on any field explicitly set to
    // `undefined` — `"key" in entry` catches that even though plain
    // property access (entry.key) reads as undefined either way.
    const entry = buildLedgerEntry({ userId: "u1", delta: 6, reason: "task_completed" });
    expect("relatedTaskId" in entry).toBe(false);
    expect("note" in entry).toBe(false);
  });
});

describe("xpAdjustmentNeedsApproval", () => {
  it("requires a second parent's approval when there is one", () => {
    expect(xpAdjustmentNeedsApproval(2)).toBe(true);
    expect(xpAdjustmentNeedsApproval(3)).toBe(true);
  });

  it("auto-approves when there is no second parent to ever approve it", () => {
    expect(xpAdjustmentNeedsApproval(1)).toBe(false);
    expect(xpAdjustmentNeedsApproval(0)).toBe(false);
  });
});
