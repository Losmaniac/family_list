import { describe, expect, it } from "vitest";
import { buildIndicatorUrl, parseIndicatorValue, WORLD_BANK_INDICATORS } from "./world-bank";

describe("buildIndicatorUrl", () => {
  it("builds a World Bank indicator URL for the country and indicator", () => {
    const url = buildIndicatorUrl("CZ", "NY.GDP.MKTP.CD");
    expect(url).toBe("https://api.worldbank.org/v2/country/CZ/indicator/NY.GDP.MKTP.CD?format=json&per_page=20");
  });
});

describe("parseIndicatorValue", () => {
  it("picks the newest year that actually has a value", () => {
    const raw = [
      { page: 1 },
      [
        { date: "2025", value: null },
        { date: "2024", value: 347082562221.377 },
        { date: "2023", value: 345059295659.911 },
      ],
    ];
    expect(parseIndicatorValue(raw)).toEqual({ year: "2024", value: 347082562221.377 });
  });

  it("returns null when every year is null or the response is malformed", () => {
    expect(parseIndicatorValue([{ page: 1 }, [{ date: "2025", value: null }]])).toBeNull();
    expect(parseIndicatorValue(null)).toBeNull();
    expect(parseIndicatorValue([{ page: 1 }])).toBeNull();
  });
});

describe("WORLD_BANK_INDICATORS", () => {
  it("formats each indicator's raw value into a readable string", () => {
    for (const indicator of WORLD_BANK_INDICATORS) {
      expect(indicator.format(1000)).toEqual(expect.any(String));
    }
  });
});
