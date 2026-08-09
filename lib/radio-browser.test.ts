import { describe, expect, it } from "vitest";
import {
  buildStationsSearchUrl,
  buildTopCountriesUrl,
  buildTopTagsUrl,
  parseFacets,
  parseStation,
  parseStations,
  RADIO_BROWSER_BASE_URL,
} from "./radio-browser";

describe("buildStationsSearchUrl", () => {
  it("includes only the filters that are set", () => {
    const url = buildStationsSearchUrl({ name: "Jazz FM" });
    expect(url).toContain(`${RADIO_BROWSER_BASE_URL}/json/stations/search?`);
    expect(url).toContain("name=Jazz+FM");
    expect(url).not.toContain("country=");
    expect(url).not.toContain("tag=");
  });

  it("includes country and tag when given", () => {
    const url = buildStationsSearchUrl({ country: "Czechia", tag: "pop" });
    expect(url).toContain("country=Czechia");
    expect(url).toContain("tag=pop");
  });

  it("defaults limit to 30 and always excludes broken streams", () => {
    const url = buildStationsSearchUrl({});
    expect(url).toContain("limit=30");
    expect(url).toContain("hidebroken=true");
  });

  it("respects a custom limit", () => {
    expect(buildStationsSearchUrl({ limit: 10 })).toContain("limit=10");
  });
});

describe("buildTopCountriesUrl / buildTopTagsUrl", () => {
  it("point at the countries/tags endpoints sorted by popularity", () => {
    expect(buildTopCountriesUrl()).toBe(`${RADIO_BROWSER_BASE_URL}/json/countries?order=stationcount&reverse=true&limit=40`);
    expect(buildTopTagsUrl(10)).toBe(`${RADIO_BROWSER_BASE_URL}/json/tags?order=stationcount&reverse=true&limit=10`);
  });
});

describe("parseStation", () => {
  it("parses a well-formed station", () => {
    const station = parseStation({
      stationuuid: "abc-123",
      name: "Radio Test",
      url_resolved: "https://stream.example.com/live",
      favicon: "https://example.com/icon.png",
      country: "Czechia",
      tags: "pop, rock , ",
      bitrate: 128,
    });
    expect(station).toEqual({
      id: "abc-123",
      name: "Radio Test",
      streamUrl: "https://stream.example.com/live",
      favicon: "https://example.com/icon.png",
      country: "Czechia",
      tags: ["pop", "rock"],
      bitrate: 128,
    });
  });

  it("drops a station with no resolved stream URL", () => {
    expect(parseStation({ stationuuid: "x", name: "No Stream" })).toBeNull();
  });

  it("drops a station with no name or no id", () => {
    expect(parseStation({ stationuuid: "x", url_resolved: "https://s.example.com" })).toBeNull();
    expect(parseStation({ name: "No Id", url_resolved: "https://s.example.com" })).toBeNull();
  });

  it("defaults missing optional fields", () => {
    const station = parseStation({ stationuuid: "x", name: "Minimal", url_resolved: "https://s.example.com" });
    expect(station).toEqual({
      id: "x",
      name: "Minimal",
      streamUrl: "https://s.example.com",
      favicon: "",
      country: "",
      tags: [],
      bitrate: 0,
    });
  });
});

describe("parseStations", () => {
  it("filters out unusable entries while keeping valid ones", () => {
    const stations = parseStations([
      { stationuuid: "1", name: "Good", url_resolved: "https://s.example.com/1" },
      { stationuuid: "2", name: "Broken" },
      { name: "No Id", url_resolved: "https://s.example.com/3" },
    ]);
    expect(stations).toHaveLength(1);
    expect(stations[0].id).toBe("1");
  });
});

describe("parseFacets", () => {
  it("keeps only named facets and defaults missing counts", () => {
    const facets = parseFacets([
      { name: "Czechia", stationcount: 120 },
      { name: "", stationcount: 5 },
      { name: "Slovakia" },
    ]);
    expect(facets).toEqual([
      { name: "Czechia", count: 120 },
      { name: "Slovakia", count: 0 },
    ]);
  });
});
