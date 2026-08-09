import { describe, expect, it } from "vitest";
import { parseDayInfo } from "./svatky-api";

describe("parseDayInfo", () => {
  it("formats the date and capitalizes the weekday", () => {
    const info = parseDayInfo({
      dayNumber: "9",
      month: { genitive: "srpna" },
      year: "2026",
      dayInWeek: "neděle",
      name: "Roman",
      isHoliday: false,
      holidayName: null,
    });
    expect(info).toEqual({
      formattedDate: "9. srpna 2026",
      dayInWeek: "Neděle",
      name: "Roman",
      isHoliday: false,
      holidayName: null,
    });
  });

  it("returns null when required date fields are missing", () => {
    expect(parseDayInfo({})).toBeNull();
    expect(parseDayInfo({ dayNumber: "9" })).toBeNull();
  });

  it("defaults a missing name to null", () => {
    const info = parseDayInfo({ dayNumber: "1", month: { genitive: "ledna" }, year: "2026" });
    expect(info?.name).toBeNull();
  });
});
