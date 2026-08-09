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

/** Full plain-text article (no exintro) — for "Zobrazit více" once the short REST summary isn't enough. */
export function buildWikiFullExtractUrl(title: string): string {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "true",
    titles: title,
    format: "json",
    origin: "*",
  });
  return `https://${WIKIPEDIA_LANG}.wikipedia.org/w/api.php?${params.toString()}`;
}

/**
 * The article's categories, e.g. "Čeští králové" — these are the closest
 * thing Wikipedia has to "topic areas" for a term (the dedicated /page/related
 * REST endpoint was decommissioned). `clshow=!hidden` filters out
 * maintenance-only categories that aren't meaningful topics to browse.
 */
export function buildWikiCategoriesUrl(title: string): string {
  const params = new URLSearchParams({
    action: "query",
    prop: "categories",
    clshow: "!hidden",
    cllimit: "20",
    titles: title,
    format: "json",
    origin: "*",
  });
  return `https://${WIKIPEDIA_LANG}.wikipedia.org/w/api.php?${params.toString()}`;
}

/** Other articles in a given category (namespace 0 only, so no sub-categories/files) — browsing a tapped "okruh". */
export function buildWikiCategoryMembersUrl(categoryTitle: string): string {
  const params = new URLSearchParams({
    action: "query",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmnamespace: "0",
    cmlimit: "20",
    format: "json",
    origin: "*",
  });
  return `https://${WIKIPEDIA_LANG}.wikipedia.org/w/api.php?${params.toString()}`;
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

/** The classic Action API keys `query.pages` by page ID, with exactly one entry for a single-title request. */
function firstPage(raw: unknown): Record<string, unknown> | undefined {
  const pages = (raw as { query?: { pages?: Record<string, unknown> } } | undefined)?.query?.pages;
  if (!pages) return undefined;
  const first = Object.values(pages)[0];
  return typeof first === "object" && first !== null ? (first as Record<string, unknown>) : undefined;
}

/** Full plain-text article body — undefined for a missing/disambiguation page. */
export function parseWikiFullExtract(raw: unknown): string | undefined {
  const page = firstPage(raw);
  const extract = page?.extract;
  return typeof extract === "string" && extract.trim() ? extract : undefined;
}

/** Category names with the "Kategorie:" namespace prefix stripped, ready to display as topic chips. */
export function parseWikiCategories(raw: unknown): string[] {
  const page = firstPage(raw);
  const categories = page?.categories;
  if (!Array.isArray(categories)) return [];
  return categories
    .map((c) => (typeof c === "object" && c !== null ? (c as { title?: unknown }).title : undefined))
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/^Kategorie:/, ""));
}

/** Article titles belonging to a browsed category. */
export function parseWikiCategoryMembers(raw: unknown): string[] {
  const members = (raw as { query?: { categorymembers?: unknown[] } } | undefined)?.query?.categorymembers;
  if (!Array.isArray(members)) return [];
  return members
    .map((m) => (typeof m === "object" && m !== null ? (m as { title?: unknown }).title : undefined))
    .filter((t): t is string => typeof t === "string");
}
