/**
 * Client-side helpers for the free, keyless Internet Archive API
 * (archive.org) — searching the "MS-DOS Games" software library and
 * building the embeddable in-browser DOS-emulator player URL, both
 * CORS-enabled for direct browser fetches. Only URL building and
 * response-shaping live here (pure, testable); the actual fetch() calls
 * happen in the /media page itself, same split as radio-browser.ts and
 * iptv-org.ts.
 */

export const INTERNET_ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php";
export const MSDOS_GAMES_COLLECTION = "softwarelibrary_msdos_games";

export function buildGameSearchUrl(query: string, limit: number = 30): string {
  const trimmed = query.trim();
  const q = trimmed
    ? `collection:(${MSDOS_GAMES_COLLECTION}) AND title:(${trimmed})`
    : `collection:(${MSDOS_GAMES_COLLECTION})`;
  const params = new URLSearchParams();
  params.set("q", q);
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "year");
  params.set("rows", String(limit));
  params.set("page", "1");
  params.set("output", "json");
  return `${INTERNET_ARCHIVE_SEARCH_URL}?${params.toString()}`;
}

/** The identifier's embeddable player page — auto-loads the in-browser DOS emulator (em-dosbox) for this item. */
export function buildGameEmbedUrl(identifier: string): string {
  return `https://archive.org/embed/${encodeURIComponent(identifier)}`;
}

export function buildGameThumbnailUrl(identifier: string): string {
  return `https://archive.org/services/img/${encodeURIComponent(identifier)}`;
}

export interface ArchiveGame {
  id: string;
  title: string;
  year: string;
}

interface RawDoc {
  identifier?: string;
  title?: string;
  year?: string | number;
}

interface RawSearchResponse {
  response?: { docs?: RawDoc[] };
}

/** Entries missing an identifier or title are dropped — nothing usable to show or play. */
export function parseGames(raw: RawSearchResponse): ArchiveGame[] {
  const docs = raw.response?.docs ?? [];
  return docs
    .filter((d): d is RawDoc & { identifier: string; title: string } => Boolean(d.identifier && d.title))
    .map((d) => ({ id: d.identifier, title: d.title, year: d.year ? String(d.year) : "" }));
}
