import { describe, expect, it } from "vitest";
import {
  CATEGORY_ORDER,
  categoryForReason,
  filterXpEntries,
  reasonLabel,
  startMsForPreset,
  totalsByDay,
  totalsByMember,
  totalsByMemberAndCategory,
  type XpAnalyticsFilter,
} from "./xp-analytics";
import type { XpLedgerEntry } from "./types";

function entry(overrides: Partial<XpLedgerEntry>): XpLedgerEntry {
  return { id: "e1", userId: "u1", delta: 10, reason: "task_completed", timestamp: 0, ...overrides };
}

describe("categoryForReason", () => {
  it("maps every known reason to a category other than 'other'", () => {
    const known = [
      "task_completed",
      "task_reverted",
      "penalty_task",
      "adhoc_task",
      "practice_correct",
      "trivia_duel_won",
      "trivia_duel_lost",
      "investment_started",
      "investment_matured",
      "investment_withdrawn_early",
      "marketplace_trade",
      "reward_redeemed",
      "pooled_contribution",
      "manual_adjustment",
    ];
    for (const reason of known) {
      expect(categoryForReason(reason)).not.toBe("other");
    }
  });

  it("falls back to 'other' for an unrecognized reason", () => {
    expect(categoryForReason("something_new")).toBe("other");
  });

  it("CATEGORY_ORDER includes every category categoryForReason can return", () => {
    expect(CATEGORY_ORDER).toContain("other");
    expect(CATEGORY_ORDER).toContain(categoryForReason("task_completed"));
  });
});

describe("reasonLabel", () => {
  it("returns a human label for a known reason and the raw string otherwise", () => {
    expect(reasonLabel("task_completed")).toBe("Splněný úkol");
    expect(reasonLabel("mystery_reason")).toBe("mystery_reason");
  });
});

describe("startMsForPreset", () => {
  it("computes an elapsed-time window relative to `now`", () => {
    const now = 1_000_000_000_000;
    expect(startMsForPreset("7d", now)).toBe(now - 7 * 86_400_000);
    expect(startMsForPreset("30d", now)).toBe(now - 30 * 86_400_000);
    expect(startMsForPreset("90d", now)).toBe(now - 90 * 86_400_000);
  });
});

describe("filterXpEntries", () => {
  const entries: XpLedgerEntry[] = [
    entry({ id: "a", userId: "u1", reason: "task_completed", timestamp: 100, delta: 5 }),
    entry({ id: "b", userId: "u2", reason: "practice_correct", timestamp: 200, delta: 1 }),
    entry({ id: "c", userId: "u1", reason: "manual_adjustment", timestamp: 300, delta: -10 }),
  ];

  it("filters by time range (inclusive start, exclusive end)", () => {
    const filter: XpAnalyticsFilter = { startMs: 100, endMs: 300 };
    expect(filterXpEntries(entries, filter).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("filters by member ids", () => {
    expect(filterXpEntries(entries, { memberIds: ["u2"] }).map((e) => e.id)).toEqual(["b"]);
  });

  it("filters by category", () => {
    expect(filterXpEntries(entries, { categories: ["manual"] }).map((e) => e.id)).toEqual(["c"]);
  });

  it("returns everything when the filter is empty", () => {
    expect(filterXpEntries(entries, {})).toHaveLength(3);
  });
});

describe("totalsByMember", () => {
  it("sums deltas per user, including negative ones", () => {
    const entries = [entry({ userId: "u1", delta: 20 }), entry({ userId: "u1", delta: -5 }), entry({ userId: "u2", delta: 3 })];
    expect(totalsByMember(entries)).toEqual({ u1: 15, u2: 3 });
  });
});

describe("totalsByMemberAndCategory", () => {
  it("sums deltas per user per category", () => {
    const entries = [
      entry({ userId: "u1", reason: "task_completed", delta: 20 }),
      entry({ userId: "u1", reason: "practice_correct", delta: 5 }),
      entry({ userId: "u1", reason: "task_reverted", delta: -3 }),
    ];
    expect(totalsByMemberAndCategory(entries)).toEqual({ u1: { tasks: 17, education: 5 } });
  });
});

describe("totalsByDay", () => {
  it("groups by family-zone calendar date", () => {
    // 2026-01-15 12:00 UTC is still 2026-01-15 in Europe/Prague.
    const noonUtc = Date.UTC(2026, 0, 15, 12, 0, 0);
    const entries = [entry({ timestamp: noonUtc, delta: 4 }), entry({ timestamp: noonUtc + 1000, delta: 6 })];
    expect(totalsByDay(entries)).toEqual({ "2026-01-15": 10 });
  });
});
