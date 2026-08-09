import { describe, expect, it } from "vitest";
import { buildWikiSearchUrl, buildWikiSummaryUrl, parseOpenSearch, parseWikiSummary } from "./wikipedia";

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
