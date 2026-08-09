import { describe, expect, it } from "vitest";
import {
  SCHEDULE_DAY_LABELS,
  SCHEDULE_MAX_PERIODS,
  daysToFirestoreMap,
  emptyScheduleDays,
  normalizeScheduleDays,
} from "./schedule";

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

  it("pads a short map to the full grid without losing existing data", () => {
    const days = normalizeScheduleDays({ "0": ["Matematika", "Čeština"] });
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    expect(days[0][0]).toBe("Matematika");
    expect(days[0][1]).toBe("Čeština");
    expect(days[0][2]).toBe("");
    expect(days[1].every((p) => p === "")).toBe(true);
  });

  it("truncates an oversized day array to the max period count", () => {
    const oversized: Record<string, string[]> = {};
    for (let i = 0; i < SCHEDULE_DAY_LABELS.length; i++) {
      oversized[String(i)] = Array(SCHEDULE_MAX_PERIODS + 5).fill("X");
    }
    const days = normalizeScheduleDays(oversized);
    expect(days[0].length).toBe(SCHEDULE_MAX_PERIODS);
  });
});

describe("daysToFirestoreMap", () => {
  it("keys each day's periods by its index as a string, avoiding a nested array", () => {
    const grid = normalizeScheduleDays({ "0": ["Matematika"] });
    const map = daysToFirestoreMap(grid);
    expect(Array.isArray(map)).toBe(false);
    expect(map["0"][0]).toBe("Matematika");
    expect(Object.keys(map)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("round-trips through normalizeScheduleDays", () => {
    const original = normalizeScheduleDays({ "2": ["Angličtina", "Dějepis"] });
    const roundTripped = normalizeScheduleDays(daysToFirestoreMap(original));
    expect(roundTripped).toEqual(original);
  });
});
