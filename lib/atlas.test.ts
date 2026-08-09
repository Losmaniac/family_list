import { describe, expect, it } from "vitest";
import { formatCapital, groupByContinent, parseCountries } from "./atlas";

describe("parseCountries", () => {
  it("prefers the Czech translation for the country name when available", () => {
    const countries = parseCountries([
      {
        cca2: "CZ",
        cca3: "CZE",
        name: { common: "Czechia" },
        capital: ["Prague"],
        region: "Europe",
        subregion: "Central Europe",
        translations: { ces: { common: "Česko" } },
        area: 78_871,
        languages: { ces: "Czech" },
        currencies: { CZK: { name: "Czech koruna", symbol: "Kč" } },
        borders: ["DEU", "AUT", "POL", "SVK"],
      },
    ]);
    expect(countries).toEqual([
      {
        id: "CZ",
        name: "Česko",
        capital: "Prague",
        continent: "Europe",
        subregion: "Central Europe",
        flag: "https://flagcdn.com/cz.svg",
        areaKm2: 78_871,
        languages: ["Czech"],
        currencies: ["Czech koruna (Kč)"],
        neighbors: ["DEU", "AUT", "POL", "SVK"],
      },
    ]);
  });

  it("resolves neighbor cca3 codes to translated country names when the neighbor is also in the list", () => {
    const countries = parseCountries([
      { cca2: "CZ", cca3: "CZE", name: { common: "Czechia" }, region: "Europe", borders: ["SVK"] },
      { cca2: "SK", cca3: "SVK", name: { common: "Slovakia" }, region: "Europe", translations: { ces: { common: "Slovensko" } } },
    ]);
    expect(countries.find((c) => c.id === "CZ")?.neighbors).toEqual(["Slovensko"]);
  });

  it("falls back to the common English name when there's no Czech translation", () => {
    const countries = parseCountries([{ cca2: "JP", name: { common: "Japan" }, capital: ["Tokyo"], region: "Asia" }]);
    expect(countries[0].name).toBe("Japan");
    expect(countries[0].flag).toBe("https://flagcdn.com/jp.svg");
  });

  it("defaults missing optional fields", () => {
    const countries = parseCountries([{ cca2: "AQ", name: { common: "Antarctica" }, region: "Antarctic" }]);
    expect(countries[0].capital).toBe("—");
    expect(countries[0].areaKm2).toBe(0);
    expect(countries[0].languages).toEqual([]);
    expect(countries[0].currencies).toEqual([]);
    expect(countries[0].neighbors).toEqual([]);
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
      { id: "CZ", name: "Česko", capital: "Praha", continent: "Europe", subregion: "", flag: "", areaKm2: 0, languages: [], currencies: [], neighbors: [] },
      { id: "SK", name: "Slovensko", capital: "Bratislava", continent: "Europe", subregion: "", flag: "", areaKm2: 0, languages: [], currencies: [], neighbors: [] },
      { id: "JP", name: "Japonsko", capital: "Tokio", continent: "Asia", subregion: "", flag: "", areaKm2: 0, languages: [], currencies: [], neighbors: [] },
    ]);
    expect(Object.keys(groups)).toEqual(["Europe", "Asia"]);
    expect(groups.Europe).toHaveLength(2);
    expect(groups.Asia).toHaveLength(1);
  });
});

describe("formatCapital", () => {
  it("puts the Czech exonym first with the international name in parentheses", () => {
    expect(formatCapital("London")).toBe("Londýn (London)");
    expect(formatCapital("Prague")).toBe("Prague");
  });

  it("returns the name as-is when there's no distinct Czech exonym", () => {
    expect(formatCapital("Ottawa")).toBe("Ottawa");
    expect(formatCapital("—")).toBe("—");
  });
});
