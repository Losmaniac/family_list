import { describe, expect, it } from "vitest";
import { czechHolidayName, czechHolidaysForYear, easterSunday } from "./czech-holidays";

describe("easterSunday", () => {
  it("matches known Easter Sundays", () => {
    expect(easterSunday(2024).toDateString()).toBe(new Date(2024, 2, 31).toDateString());
    expect(easterSunday(2025).toDateString()).toBe(new Date(2025, 3, 20).toDateString());
    expect(easterSunday(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
  });
});

describe("czechHolidaysForYear", () => {
  it("includes every fixed-date holiday", () => {
    const holidays = czechHolidaysForYear(2026);
    expect(holidays.get("2026-01-01")).toBe("Nový rok");
    expect(holidays.get("2026-05-01")).toBe("Svátek práce");
    expect(holidays.get("2026-05-08")).toBe("Den vítězství");
    expect(holidays.get("2026-07-05")).toBe("Cyril a Metoděj");
    expect(holidays.get("2026-07-06")).toBe("Mistr Jan Hus");
    expect(holidays.get("2026-09-28")).toBe("Den české státnosti");
    expect(holidays.get("2026-10-28")).toBe("Vznik samostatného československého státu");
    expect(holidays.get("2026-11-17")).toBe("Den boje za svobodu a demokracii");
    expect(holidays.get("2026-12-24")).toBe("Štědrý den");
    expect(holidays.get("2026-12-25")).toBe("1. svátek vánoční");
    expect(holidays.get("2026-12-26")).toBe("2. svátek vánoční");
  });

  it("includes Good Friday and Easter Monday, derived from Easter Sunday", () => {
    // Easter Sunday 2026 is April 5.
    const holidays = czechHolidaysForYear(2026);
    expect(holidays.get("2026-04-03")).toBe("Velký pátek");
    expect(holidays.get("2026-04-06")).toBe("Velikonoční pondělí");
  });
});

describe("czechHolidayName", () => {
  it("returns the name for a holiday date", () => {
    expect(czechHolidayName(new Date(2026, 0, 1))).toBe("Nový rok");
  });

  it("returns undefined for a non-holiday date", () => {
    expect(czechHolidayName(new Date(2026, 0, 2))).toBeUndefined();
  });
});
