import { describe, expect, it } from "vitest";
import {
  adHocCooldownInfo,
  formatCooldownRemaining,
  formatDurationMinutes,
  latestCompletionByType,
} from "./adhoc-tasks";

describe("adHocCooldownInfo", () => {
  it("is never on cooldown when never completed", () => {
    expect(adHocCooldownInfo(120, undefined, 1_000_000)).toEqual({
      onCooldown: false,
      remainingMs: 0,
      readyAt: null,
    });
  });

  it("is never on cooldown when the type has no cooldown configured", () => {
    expect(adHocCooldownInfo(0, 1_000_000, 1_000_000)).toEqual({ onCooldown: false, remainingMs: 0, readyAt: null });
  });

  it("is on cooldown right after completion, with the correct remaining time", () => {
    const lastCompletedAt = 10_000_000;
    const cooldownMinutes = 120;
    const now = lastCompletedAt + 30 * 60_000; // 30 minutes later, 90 remaining
    const result = adHocCooldownInfo(cooldownMinutes, lastCompletedAt, now);
    expect(result.onCooldown).toBe(true);
    expect(result.remainingMs).toBe(90 * 60_000);
    expect(result.readyAt).toBe(lastCompletedAt + cooldownMinutes * 60_000);
  });

  it("clears once the cooldown window has fully elapsed", () => {
    const lastCompletedAt = 10_000_000;
    const now = lastCompletedAt + 121 * 60_000;
    expect(adHocCooldownInfo(120, lastCompletedAt, now).onCooldown).toBe(false);
  });
});

describe("latestCompletionByType", () => {
  it("keeps only the most recent completion per type, regardless of input order", () => {
    const result = latestCompletionByType([
      { typeId: "dishwasher", timestamp: 100 },
      { typeId: "laundry", timestamp: 50 },
      { typeId: "dishwasher", timestamp: 300 },
      { typeId: "dishwasher", timestamp: 200 },
    ]);
    expect(result).toEqual({ dishwasher: 300, laundry: 50 });
  });

  it("returns an empty object for no completions", () => {
    expect(latestCompletionByType([])).toEqual({});
  });
});

describe("formatCooldownRemaining", () => {
  it("formats hours and minutes", () => {
    expect(formatCooldownRemaining(2 * 60 * 60_000 + 5 * 60_000)).toBe("2h 5m");
  });

  it("formats minutes and seconds", () => {
    expect(formatCooldownRemaining(12 * 60_000 + 3_000)).toBe("12m 03s");
  });

  it("formats seconds only", () => {
    expect(formatCooldownRemaining(45_000)).toBe("45s");
  });

  it("never goes negative", () => {
    expect(formatCooldownRemaining(-5000)).toBe("0s");
  });
});

describe("formatDurationMinutes", () => {
  it("formats sub-hour durations in minutes", () => {
    expect(formatDurationMinutes(30)).toBe("30 min");
  });

  it("formats whole hours", () => {
    expect(formatDurationMinutes(120)).toBe("2 h");
  });

  it("formats hours with leftover minutes", () => {
    expect(formatDurationMinutes(150)).toBe("2 h 30 min");
  });
});
