/**
 * Client-side helpers for the free, keyless IPTV-org API
 * (iptv-org.github.io/api) — static JSON files listing TV channels and
 * their live stream URLs, CORS-enabled for direct browser fetches. Only
 * URL building and response-shaping (joining channels with streams,
 * filtering) live here (pure, testable); the actual fetch() calls happen
 * in the /media page itself, same split as radio-browser.ts.
 */

export const IPTV_ORG_BASE_URL = "https://iptv-org.github.io/api";

export function channelsUrl(): string {
  return `${IPTV_ORG_BASE_URL}/channels.json`;
}

export function streamsUrl(): string {
  return `${IPTV_ORG_BASE_URL}/streams.json`;
}

export function countriesUrl(): string {
  return `${IPTV_ORG_BASE_URL}/countries.json`;
}

export function categoriesUrl(): string {
  return `${IPTV_ORG_BASE_URL}/categories.json`;
}

export interface TvChannel {
  id: string;
  name: string;
  /** Two-letter country code, matching CountryOption.code. */
  country: string;
  categories: string[];
  logo: string;
  streamUrl: string;
}

interface RawChannel {
  id?: string;
  name?: string;
  country?: string;
  categories?: string[];
  logo?: string;
  closed?: boolean;
  replaced_by?: string | null;
}

interface RawStream {
  channel?: string | null;
  url?: string;
}

/**
 * Joins channels with their stream URL. A channel is dropped if it's
 * closed, was replaced by another entry, has no matching stream, or the
 * stream is plain http:// — same spirit as radio-browser's hidebroken
 * filter, just done client-side since these are static files with no
 * server-side query support. The http:// exclusion isn't a health check,
 * it's a certainty: our app is served over https, so an http:// stream is
 * mixed content the browser blocks outright, no matter how "live" the
 * stream itself is — about a fifth of all listed streams are like this.
 */
export function joinChannelsWithStreams(rawChannels: RawChannel[], rawStreams: RawStream[]): TvChannel[] {
  const streamByChannel = new Map<string, string>();
  for (const s of rawStreams) {
    if (s.channel && s.url?.startsWith("https://") && !streamByChannel.has(s.channel)) {
      streamByChannel.set(s.channel, s.url);
    }
  }

  const channels: TvChannel[] = [];
  for (const c of rawChannels) {
    if (!c.id || !c.name || c.closed || c.replaced_by) continue;
    const streamUrl = streamByChannel.get(c.id);
    if (!streamUrl) continue;
    channels.push({
      id: c.id,
      name: c.name,
      country: c.country ?? "",
      categories: c.categories ?? [],
      logo: c.logo ?? "",
      streamUrl,
    });
  }
  return channels;
}

export interface TvFilterOptions {
  country?: string;
  category?: string;
  name?: string;
}

export function filterChannels(channels: TvChannel[], filters: TvFilterOptions): TvChannel[] {
  const nameQuery = filters.name?.trim().toLowerCase();
  return channels.filter((c) => {
    if (filters.country && c.country !== filters.country) return false;
    if (filters.category && !c.categories.includes(filters.category)) return false;
    if (nameQuery && !c.name.toLowerCase().includes(nameQuery)) return false;
    return true;
  });
}

export interface CountryOption {
  code: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

interface RawCountry {
  code?: string;
  name?: string;
}

interface RawCategory {
  id?: string;
  name?: string;
}

export function parseCountries(raw: RawCountry[]): CountryOption[] {
  return raw
    .filter((c): c is Required<RawCountry> => Boolean(c.code && c.name))
    .map((c) => ({ code: c.code, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function parseCategories(raw: RawCategory[]): CategoryOption[] {
  return raw
    .filter((c): c is Required<RawCategory> => Boolean(c.id && c.name))
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
