import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysInMonth, isSameDay, startOfMonth, startOfWeek } from "./date-utils";

describe("startOfMonth", () => {
  it("returns the 1st of the given date's month", () => {
    const start = startOfMonth(new Date(2026, 7, 23));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
  });
});

describe("daysInMonth", () => {
  it("handles a 31-day month", () => {
    expect(daysInMonth(new Date(2026, 7, 1))).toBe(31); // August
  });

  it("handles a 30-day month", () => {
    expect(daysInMonth(new Date(2026, 8, 1))).toBe(30); // September
  });

  it("handles February in a leap year", () => {
    expect(daysInMonth(new Date(2028, 1, 1))).toBe(29);
  });

  it("handles February in a non-leap year", () => {
    expect(daysInMonth(new Date(2026, 1, 1))).toBe(28);
  });
});

describe("addMonths", () => {
  it("moves forward within the same year", () => {
    const next = addMonths(new Date(2026, 7, 15), 1);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(8);
    expect(next.getDate()).toBe(1);
  });

  it("rolls over into the next year", () => {
    const next = addMonths(new Date(2026, 11, 15), 1);
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
  });

  it("rolls back into the previous year", () => {
    const prev = addMonths(new Date(2026, 0, 15), -1);
    expect(prev.getFullYear()).toBe(2025);
    expect(prev.getMonth()).toBe(11);
  });
});

describe("isSameDay", () => {
  it("is true for the same calendar day at different times", () => {
    expect(isSameDay(new Date(2026, 7, 8, 3, 0), new Date(2026, 7, 8, 22, 0))).toBe(true);
  });

  it("is false for different days", () => {
    expect(isSameDay(new Date(2026, 7, 8), new Date(2026, 7, 9))).toBe(false);
  });

  it("is false for the same day/month in a different year", () => {
    expect(isSameDay(new Date(2026, 7, 8), new Date(2027, 7, 8))).toBe(false);
  });
});

describe("startOfWeek", () => {
  it("returns the same date when given a Monday", () => {
    const monday = new Date(2026, 7, 3); // Aug 3 2026 is a Monday
    const result = startOfWeek(monday);
    expect(result.getDate()).toBe(3);
  });

  it("rolls back to Monday from mid-week", () => {
    const result = startOfWeek(new Date(2026, 7, 6)); // Thursday
    expect(result.getDate()).toBe(3);
  });

  it("rolls back to Monday from Sunday", () => {
    const result = startOfWeek(new Date(2026, 7, 9)); // Sunday
    expect(result.getDate()).toBe(3);
  });
});

describe("addDays", () => {
  it("moves forward within the same month", () => {
    const result = addDays(new Date(2026, 7, 3), 4);
    expect(result.getDate()).toBe(7);
    expect(result.getMonth()).toBe(7);
  });

  it("rolls over into the next month", () => {
    const result = addDays(new Date(2026, 7, 30), 3);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(2);
  });

  it("supports negative deltas", () => {
    const result = addDays(new Date(2026, 7, 3), -3);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(31);
  });
});
