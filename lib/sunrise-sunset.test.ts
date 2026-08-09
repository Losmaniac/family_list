import { describe, expect, it } from "vitest";
import { buildSunriseSunsetUrl, parseSunTimes } from "./sunrise-sunset";

describe("buildSunriseSunsetUrl", () => {
  it("builds a sunrise-sunset.org URL for the given coordinates", () => {
    const url = buildSunriseSunsetUrl(49.5833, 17.7);
    expect(url).toContain("lat=49.5833");
    expect(url).toContain("lng=17.7");
    expect(url).toContain("date=today");
  });
});

describe("parseSunTimes", () => {
  it("formats sunrise/sunset in the family time zone", () => {
    const times = parseSunTimes({
      status: "OK",
      results: { sunrise: "2026-08-09T03:29:45+00:00", sunset: "2026-08-09T18:19:43+00:00" },
    });
    expect(times).not.toBeNull();
    expect(times?.sunrise).toMatch(/^\d{1,2}:\d{2}$/);
    expect(times?.sunset).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it("returns null when the API status isn't OK", () => {
    expect(parseSunTimes({ status: "INVALID_REQUEST" })).toBeNull();
  });

  it("returns null when a time is missing", () => {
    expect(parseSunTimes({ status: "OK", results: { sunrise: "2026-08-09T03:29:45+00:00" } })).toBeNull();
  });
});
