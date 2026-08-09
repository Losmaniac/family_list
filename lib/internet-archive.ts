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

/**
 * archive.org's DOS emulator has no on-screen touch controls at all (see
 * MediaPage's Hry tab) — only real keyboard/gamepad input works. There's no
 * "control scheme" field to filter on directly, but games tagged with one of
 * these genres are usually mouse-driven, which taps-as-clicks already handle
 * fine on touch. Best-effort, not a guarantee: sparse/inconsistent tagging
 * means plenty of genuinely mouse-only games aren't tagged this way at all.
 */
const MOBILE_FRIENDLY_SUBJECTS = [
  "point-and-click",
  "puzzle",
  "solitaire",
  '"card game"',
  "mahjong",
  '"board game"',
  "simulation",
];

export interface GameSearchOptions {
  limit?: number;
  /** Restrict to genres that are usually mouse-driven — see MOBILE_FRIENDLY_SUBJECTS. */
  mobileFriendly?: boolean;
}

export function buildGameSearchUrl(query: string, options: GameSearchOptions = {}): string {
  const { limit = 30, mobileFriendly = false } = options;
  const trimmed = query.trim();
  let q = trimmed ? `collection:(${MSDOS_GAMES_COLLECTION}) AND title:(${trimmed})` : `collection:(${MSDOS_GAMES_COLLECTION})`;
  if (mobileFriendly) q += ` AND subject:(${MOBILE_FRIENDLY_SUBJECTS.join(" OR ")})`;
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
