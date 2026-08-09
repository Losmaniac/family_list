import { describe, expect, it } from "vitest";
import {
  buildWikiCategoriesUrl,
  buildWikiCategoryMembersUrl,
  buildWikiFullExtractUrl,
  buildWikiSearchUrl,
  buildWikiSummaryUrl,
  parseOpenSearch,
  parseWikiCategories,
  parseWikiCategoryMembers,
  parseWikiFullExtract,
  parseWikiSummary,
} from "./wikipedia";

describe("buildWikiSearchUrl / buildWikiSummaryUrl", () => {
  it("builds an opensearch URL against Czech Wikipedia", () => {
    const url = buildWikiSearchUrl("Praha");
    expect(url).toContain("cs.wikipedia.org");
    expect(url).toContain("search=Praha");
    expect(url).toContain("action=opensearch");
  });

  it("URL-encodes the title in the summary URL", () => {
    expect(buildWikiSummaryUrl("Karel IV.")).toBe("https://cs.wikipedia.org/api/rest_v1/page/summary/Karel%20IV.");
  });
});

describe("parseOpenSearch", () => {
  it("extracts titles from the [query, titles, descriptions, urls] tuple", () => {
    const raw = ["Praha", ["Praha", "Praha 1"], ["desc1", "desc2"], ["url1", "url2"]];
    expect(parseOpenSearch(raw)).toEqual([{ title: "Praha" }, { title: "Praha 1" }]);
  });

  it("returns an empty array for a malformed response", () => {
    expect(parseOpenSearch(null)).toEqual([]);
    expect(parseOpenSearch({})).toEqual([]);
    expect(parseOpenSearch(["query"])).toEqual([]);
  });
});

describe("parseWikiSummary", () => {
  it("parses a well-formed summary", () => {
    const summary = parseWikiSummary({
      title: "Praha",
      extract: "Praha je hlavní město České republiky.",
      thumbnail: { source: "https://upload.example.com/praha.jpg" },
      content_urls: { desktop: { page: "https://cs.wikipedia.org/wiki/Praha" } },
    });
    expect(summary).toEqual({
      title: "Praha",
      extract: "Praha je hlavní město České republiky.",
      thumbnail: "https://upload.example.com/praha.jpg",
      pageUrl: "https://cs.wikipedia.org/wiki/Praha",
    });
  });

  it("returns null when title or extract is missing", () => {
    expect(parseWikiSummary({ title: "Praha" })).toBeNull();
    expect(parseWikiSummary({ extract: "Text" })).toBeNull();
  });

  it("defaults missing thumbnail/url to empty strings", () => {
    const summary = parseWikiSummary({ title: "X", extract: "Y" });
    expect(summary).toEqual({ title: "X", extract: "Y", thumbnail: "", pageUrl: "" });
  });
});

describe("buildWikiFullExtractUrl / buildWikiCategoriesUrl / buildWikiCategoryMembersUrl", () => {
  it("build Action API URLs against Czech Wikipedia with the expected query params", () => {
    expect(buildWikiFullExtractUrl("Karel IV.")).toContain("prop=extracts");
    expect(buildWikiCategoriesUrl("Karel IV.")).toContain("prop=categories");
    expect(buildWikiCategoryMembersUrl("Kategorie:Čeští králové")).toContain("list=categorymembers");
  });
});

describe("parseWikiFullExtract", () => {
  it("extracts the plain-text body from a single-page query response", () => {
    const raw = { query: { pages: { "123": { title: "Praha", extract: "Praha je hlavní město…" } } } };
    expect(parseWikiFullExtract(raw)).toBe("Praha je hlavní město…");
  });

  it("returns undefined for a missing or empty extract", () => {
    expect(parseWikiFullExtract({ query: { pages: { "-1": { title: "X", missing: true } } } })).toBeUndefined();
    expect(parseWikiFullExtract({})).toBeUndefined();
  });
});

describe("parseWikiCategories", () => {
  it("strips the 'Kategorie:' namespace prefix", () => {
    const raw = {
      query: {
        pages: {
          "123": { title: "Karel IV.", categories: [{ ns: 14, title: "Kategorie:Čeští králové" }, { ns: 14, title: "Kategorie:Lucemburkové" }] },
        },
      },
    };
    expect(parseWikiCategories(raw)).toEqual(["Čeští králové", "Lucemburkové"]);
  });

  it("returns an empty array when there are no categories", () => {
    expect(parseWikiCategories({ query: { pages: { "1": { title: "X" } } } })).toEqual([]);
    expect(parseWikiCategories({})).toEqual([]);
  });
});

describe("parseWikiCategoryMembers", () => {
  it("extracts member titles", () => {
    const raw = { query: { categorymembers: [{ title: "Karel IV." }, { title: "Václav IV." }] } };
    expect(parseWikiCategoryMembers(raw)).toEqual(["Karel IV.", "Václav IV."]);
  });

  it("returns an empty array for a malformed response", () => {
    expect(parseWikiCategoryMembers({})).toEqual([]);
    expect(parseWikiCategoryMembers(null)).toEqual([]);
  });
});
