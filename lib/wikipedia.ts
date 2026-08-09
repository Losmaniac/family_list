/**
 * Client-side helpers for the free, keyless Wikipedia API (Czech
 * Wikipedia) — opensearch for suggestions, REST summary for the article
 * extract, both CORS-enabled for direct browser fetches. Informational
 * only for the Vzdělání "Encyklopedie" section, no XP/quiz involved. Only
 * URL building and response-shaping live here (pure, testable); fetch()
 * calls happen in components/EncyclopediaExplorer.tsx.
 */

export const WIKIPEDIA_LANG = "cs";

export function buildWikiSearchUrl(query: string): string {
  const params = new URLSearchParams({ action: "opensearch", search: query, format: "json", origin: "*", limit: "10" });
  return `https://${WIKIPEDIA_LANG}.wikipedia.org/w/api.php?${params.toString()}`;
}

export function buildWikiSummaryUrl(title: string): string {
  return `https://${WIKIPEDIA_LANG}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
}

export interface WikiSearchResult {
  title: string;
}

/** The opensearch endpoint returns a fixed 4-element tuple: [query, titles[], descriptions[], urls[]]. */
export function parseOpenSearch(raw: unknown): WikiSearchResult[] {
  if (!Array.isArray(raw) || !Array.isArray(raw[1])) return [];
  return (raw[1] as unknown[]).filter((t): t is string => typeof t === "string").map((title) => ({ title }));
}

export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail: string;
  pageUrl: string;
}

interface RawSummary {
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

export function parseWikiSummary(raw: RawSummary): WikiSummary | null {
  if (!raw.title || !raw.extract) return null;
  return {
    title: raw.title,
    extract: raw.extract,
    thumbnail: raw.thumbnail?.source ?? "",
    pageUrl: raw.content_urls?.desktop?.page ?? "",
  };
}
