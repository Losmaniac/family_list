import { describe, expect, it } from "vitest";
import { SCHEDULE_DAY_LABELS, SCHEDULE_MAX_PERIODS, emptyScheduleDays, normalizeScheduleDays } from "./schedule";

describe("emptyScheduleDays", () => {
  it("builds a full grid of empty strings", () => {
    const days = emptyScheduleDays();
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    for (const periods of days) {
      expect(periods.length).toBe(SCHEDULE_MAX_PERIODS);
      expect(periods.every((p) => p === "")).toBe(true);
    }
  });
});

describe("normalizeScheduleDays", () => {
  it("returns a full empty grid when given undefined", () => {
    const days = normalizeScheduleDays(undefined);
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    expect(days[0].length).toBe(SCHEDULE_MAX_PERIODS);
  });

  it("pads a short array to the full grid without losing existing data", () => {
    const days = normalizeScheduleDays([["Matematika", "Čeština"]]);
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    expect(days[0][0]).toBe("Matematika");
    expect(days[0][1]).toBe("Čeština");
    expect(days[0][2]).toBe("");
    expect(days[1].every((p) => p === "")).toBe(true);
  });

  it("truncates an oversized array to the max period count", () => {
    const oversized = Array.from({ length: SCHEDULE_DAY_LABELS.length }, () =>
      Array(SCHEDULE_MAX_PERIODS + 5).fill("X")
    );
    const days = normalizeScheduleDays(oversized);
    expect(days[0].length).toBe(SCHEDULE_MAX_PERIODS);
  });
});
