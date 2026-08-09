import { describe, expect, it } from "vitest";
import {
  buildGameEmbedUrl,
  buildGameSearchUrl,
  buildGameThumbnailUrl,
  INTERNET_ARCHIVE_SEARCH_URL,
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
    expect(buildGameSearchUrl("", { limit: 10 })).toContain("rows=10");
  });

  it("requests JSON output", () => {
    expect(buildGameSearchUrl("")).toContain("output=json");
  });

  it("adds a mobile-friendly genre filter only when requested", () => {
    expect(decodeURIComponent(buildGameSearchUrl("").replace(/\+/g, " "))).not.toContain("subject:");
    const url = decodeURIComponent(buildGameSearchUrl("", { mobileFriendly: true }).replace(/\+/g, " "));
    expect(url).toContain("subject:(point-and-click OR");
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
