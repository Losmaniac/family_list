import { describe, expect, it } from "vitest";
import {
  buildGameEmbedUrl,
  buildGameSearchUrl,
  buildGameThumbnailUrl,
  filterMobileFriendlyGames,
  INTERNET_ARCHIVE_SEARCH_URL,
  MOBILE_FRIENDLY_GAMES,
  MSDOS_GAMES_COLLECTION,
  parseGames,
} from "./internet-archive";

describe("buildGameSearchUrl", () => {
  it("scopes the query to the MS-DOS games collection", () => {
    const url = buildGameSearchUrl("");
    expect(url).toContain(INTERNET_ARCHIVE_SEARCH_URL);
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain(`collection:(${MSDOS_GAMES_COLLECTION})`);
  });

  it("adds a title filter when a query is given", () => {
    const url = buildGameSearchUrl("prince of persia");
    expect(decodeURIComponent(url.replace(/\+/g, " "))).toContain("title:(prince of persia)");
  });

  it("defaults rows to 30 and respects a custom limit", () => {
    expect(buildGameSearchUrl("")).toContain("rows=30");
    expect(buildGameSearchUrl("", 10)).toContain("rows=10");
  });

  it("requests JSON output", () => {
    expect(buildGameSearchUrl("")).toContain("output=json");
  });
});

describe("buildGameEmbedUrl / buildGameThumbnailUrl", () => {
  it("builds the embeddable player URL", () => {
    expect(buildGameEmbedUrl("prince_of_persia")).toBe("https://archive.org/embed/prince_of_persia");
  });

  it("builds the thumbnail URL", () => {
    expect(buildGameThumbnailUrl("prince_of_persia")).toBe("https://archive.org/services/img/prince_of_persia");
  });

  it("URL-encodes the identifier", () => {
    expect(buildGameEmbedUrl("a/b")).toBe("https://archive.org/embed/a%2Fb");
  });
});

describe("parseGames", () => {
  it("parses well-formed docs", () => {
    const games = parseGames({
      response: { docs: [{ identifier: "doom", title: "Doom", year: 1993 }] },
    });
    expect(games).toEqual([{ id: "doom", title: "Doom", year: "1993" }]);
  });

  it("drops docs missing an identifier or title", () => {
    const games = parseGames({
      response: { docs: [{ title: "No id" }, { identifier: "no-title" }] },
    });
    expect(games).toHaveLength(0);
  });

  it("defaults a missing year to an empty string", () => {
    const games = parseGames({ response: { docs: [{ identifier: "x", title: "X" }] } });
    expect(games[0].year).toBe("");
  });

  it("returns an empty array when the response has no docs", () => {
    expect(parseGames({})).toEqual([]);
  });
});

describe("filterMobileFriendlyGames", () => {
  it("returns the full curated list when the query is empty", () => {
    expect(filterMobileFriendlyGames("")).toEqual(MOBILE_FRIENDLY_GAMES);
  });

  it("filters by a case-insensitive title substring", () => {
    const result = filterMobileFriendlyGames("monkey");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((g) => g.title.toLowerCase().includes("monkey"))).toBe(true);
  });

  it("returns nothing for a query that matches no curated title", () => {
    expect(filterMobileFriendlyGames("doom")).toEqual([]);
  });

  it("every curated entry has a non-empty id, title, and year", () => {
    for (const game of MOBILE_FRIENDLY_GAMES) {
      expect(game.id.length).toBeGreaterThan(0);
      expect(game.title.length).toBeGreaterThan(0);
      expect(game.year.length).toBeGreaterThan(0);
    }
  });
});
