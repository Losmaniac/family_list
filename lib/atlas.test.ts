import { describe, expect, it } from "vitest";
import { groupByContinent, parseCountries } from "./atlas";

describe("parseCountries", () => {
  it("prefers the Czech translation for the country name when available", () => {
    const countries = parseCountries([
      {
        cca2: "CZ",
        name: { common: "Czechia" },
        capital: ["Prague"],
        region: "Europe",
        translations: { ces: { common: "Česko" } },
      },
    ]);
    expect(countries).toEqual([
      { id: "CZ", name: "Česko", capital: "Prague", continent: "Europe", flag: "https://flagcdn.com/cz.svg" },
    ]);
  });

  it("falls back to the common English name when there's no Czech translation", () => {
    const countries = parseCountries([{ cca2: "JP", name: { common: "Japan" }, capital: ["Tokyo"], region: "Asia" }]);
    expect(countries[0].name).toBe("Japan");
    expect(countries[0].flag).toBe("https://flagcdn.com/jp.svg");
  });

  it("defaults a missing capital to an em dash", () => {
    const countries = parseCountries([{ cca2: "AQ", name: { common: "Antarctica" }, region: "Antarctic" }]);
    expect(countries[0].capital).toBe("—");
  });

  it("drops entries missing an id, name, or region", () => {
    const countries = parseCountries([
      { name: { common: "No code" }, region: "Europe" },
      { cca2: "XX", region: "Europe" },
      { cca2: "XX", name: { common: "No region" } },
    ]);
    expect(countries).toHaveLength(0);
  });

  it("sorts alphabetically by name", () => {
    const countries = parseCountries([
      { cca2: "SK", name: { common: "Slovakia" }, region: "Europe" },
      { cca2: "CZ", name: { common: "Czechia" }, region: "Europe" },
    ]);
    expect(countries.map((c) => c.name)).toEqual(["Czechia", "Slovakia"]);
  });
});

describe("groupByContinent", () => {
  it("groups countries by their continent", () => {
    const groups = groupByContinent([
      { id: "CZ", name: "Česko", capital: "Praha", continent: "Europe", flag: "" },
      { id: "SK", name: "Slovensko", capital: "Bratislava", continent: "Europe", flag: "" },
      { id: "JP", name: "Japonsko", capital: "Tokio", continent: "Asia", flag: "" },
    ]);
    expect(Object.keys(groups)).toEqual(["Europe", "Asia"]);
    expect(groups.Europe).toHaveLength(2);
    expect(groups.Asia).toHaveLength(1);
  });
});
