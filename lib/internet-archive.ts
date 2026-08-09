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

/**
 * archive.org's DOS emulator has no on-screen touch controls at all (see
 * MediaPage's Hry tab), and there's no "requires a keyboard" field in its
 * metadata to filter on — a genre tag like "puzzle" or "card game" doesn't
 * actually tell you the control scheme (plenty of DOS card/puzzle ports
 * from that era are keyboard-only despite the genre). So instead of
 * guessing from tags, this is a small hand-checked list of point-and-click
 * adventures confirmed to be entirely mouse-driven (tap-as-click already
 * works fine on touch) — every title here was designed by its original
 * developer specifically to need no keyboard at all, not inferred from
 * crowd-sourced metadata.
 */
export const MOBILE_FRIENDLY_GAMES: ArchiveGame[] = [
  { id: "msdos_Loom_1990", title: "Loom", year: "1990" },
  { id: "mnkyega", title: "The Secret of Monkey Island", year: "1990" },
  { id: "msdos_Monkey_Island_2_-_LeChucks_Revenge_1991", title: "Monkey Island 2: LeChuck's Revenge", year: "1991" },
  { id: "msdos_Maniac_Mansion_Enhanced_1988", title: "Maniac Mansion", year: "1988" },
  {
    id: "msdos_Zak_McKracken_and_the_Alien_Mindbenders_Enhanced_1988",
    title: "Zak McKracken and the Alien Mindbenders",
    year: "1988",
  },
  {
    id: "msdos_Kings_Quest_V_-_Absence_Makes_the_Heart_Go_Yonder_1990",
    title: "King's Quest V",
    year: "1990",
  },
  { id: "msdos_Return_to_Zork", title: "Return to Zork", year: "1993" },
  { id: "msdos_Rise_of_the_Dragon_1990", title: "Rise of the Dragon", year: "1990" },
  { id: "msdos_Discworld_1995", title: "Discworld", year: "1995" },
  { id: "msdos_Simon_the_Sorcerer_1993", title: "Simon the Sorcerer", year: "1993" },
];

/** Case-insensitive title-substring filter over MOBILE_FRIENDLY_GAMES — same search-box behavior as the full catalog, just over the small curated list. */
export function filterMobileFriendlyGames(query: string): ArchiveGame[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOBILE_FRIENDLY_GAMES;
  return MOBILE_FRIENDLY_GAMES.filter((g) => g.title.toLowerCase().includes(q));
}
