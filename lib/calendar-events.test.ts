import { describe, expect, it } from "vitest";
import { eventOccursOnDate } from "./calendar-events";
import type { CalendarEvent } from "./types";

function makeEvent(date: string, recurrence?: CalendarEvent["recurrence"]): CalendarEvent {
  return {
    id: "e1",
    title: "Test",
    date,
    category: "other",
    memberId: "m1",
    createdBy: "m1",
    timestamp: 0,
    recurrence,
  };
}

describe("eventOccursOnDate", () => {
  it("matches a one-off event only on its own date", () => {
    const evt = makeEvent("2026-08-10");
    expect(eventOccursOnDate(evt, "2026-08-10")).toBe(true);
    expect(eventOccursOnDate(evt, "2026-08-17")).toBe(false);
    expect(eventOccursOnDate(evt, "2026-08-03")).toBe(false);
  });

  it("never occurs before the start date, even when recurring", () => {
    const evt = makeEvent("2026-08-10", "weekly");
    expect(eventOccursOnDate(evt, "2026-08-03")).toBe(false);
  });

  it("recurs weekly on the same weekday", () => {
    const evt = makeEvent("2026-08-10", "weekly");
    expect(eventOccursOnDate(evt, "2026-08-17")).toBe(true);
    expect(eventOccursOnDate(evt, "2026-08-24")).toBe(true);
    expect(eventOccursOnDate(evt, "2026-08-18")).toBe(false);
  });

  it("recurs monthly on the same day-of-month", () => {
    const evt = makeEvent("2026-08-10", "monthly");
    expect(eventOccursOnDate(evt, "2026-09-10")).toBe(true);
    expect(eventOccursOnDate(evt, "2026-12-10")).toBe(true);
    expect(eventOccursOnDate(evt, "2026-09-11")).toBe(false);
  });

  it("recurs yearly on the same month and day", () => {
    const evt = makeEvent("2026-08-10", "yearly");
    expect(eventOccursOnDate(evt, "2027-08-10")).toBe(true);
    expect(eventOccursOnDate(evt, "2027-09-10")).toBe(false);
  });
});
