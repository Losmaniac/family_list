import { describe, expect, it } from "vitest";
import {
  SCHEDULE_DAY_LABELS,
  SCHEDULE_MAX_PERIODS,
  SCHEDULE_PERIOD_TIMES,
  daysToFirestoreMap,
  emptyScheduleDays,
  normalizeScheduleDays,
} from "./schedule";

describe("emptyScheduleDays", () => {
  it("builds a full grid of empty cells", () => {
    const days = emptyScheduleDays();
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    for (const periods of days) {
      expect(periods.length).toBe(SCHEDULE_MAX_PERIODS);
      expect(periods.every((p) => p.subject === "" && p.teacher === undefined)).toBe(true);
    }
  });
});

describe("SCHEDULE_PERIOD_TIMES", () => {
  it("has one time range per period", () => {
    expect(SCHEDULE_PERIOD_TIMES.length).toBe(SCHEDULE_MAX_PERIODS);
  });
});

describe("normalizeScheduleDays", () => {
  it("returns a full empty grid when given undefined", () => {
    const days = normalizeScheduleDays(undefined);
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    expect(days[0].length).toBe(SCHEDULE_MAX_PERIODS);
  });

  it("pads a short map to the full grid without losing existing data", () => {
    const days = normalizeScheduleDays({ "0": [{ subject: "Matematika" }, { subject: "Čeština", teacher: "Šaf" }] });
    expect(days.length).toBe(SCHEDULE_DAY_LABELS.length);
    expect(days[0][0]).toEqual({ subject: "Matematika" });
    expect(days[0][1]).toEqual({ subject: "Čeština", teacher: "Šaf" });
    expect(days[0][2]).toEqual({ subject: "" });
    expect(days[1].every((p) => p.subject === "")).toBe(true);
  });

  it("upgrades a bare subject string from before teacher names existed", () => {
    const days = normalizeScheduleDays({ "0": ["Matematika"] });
    expect(days[0][0]).toEqual({ subject: "Matematika" });
  });

  it("truncates an oversized day array to the max period count", () => {
    const oversized: Record<string, { subject: string }[]> = {};
    for (let i = 0; i < SCHEDULE_DAY_LABELS.length; i++) {
      oversized[String(i)] = Array.from({ length: SCHEDULE_MAX_PERIODS + 5 }, () => ({ subject: "X" }));
    }
    const days = normalizeScheduleDays(oversized);
    expect(days[0].length).toBe(SCHEDULE_MAX_PERIODS);
  });
});

describe("daysToFirestoreMap", () => {
  it("keys each day's periods by its index as a string, avoiding a nested array", () => {
    const grid = normalizeScheduleDays({ "0": [{ subject: "Matematika" }] });
    const map = daysToFirestoreMap(grid);
    expect(Array.isArray(map)).toBe(false);
    expect(map["0"][0]).toEqual({ subject: "Matematika" });
    expect(Object.keys(map)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("round-trips through normalizeScheduleDays", () => {
    const original = normalizeScheduleDays({ "2": [{ subject: "Angličtina" }, { subject: "Dějepis", teacher: "Nov" }] });
    const roundTripped = normalizeScheduleDays(daysToFirestoreMap(original));
    expect(roundTripped).toEqual(original);
  });
});
