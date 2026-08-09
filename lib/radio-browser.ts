/**
 * Client-side helpers for the free, keyless Radio Browser API
 * (radio-browser.info) — a community-maintained directory of internet
 * radio stream URLs, CORS-enabled for direct browser fetches. Only URL
 * building and response-shaping live here (pure, testable); the actual
 * fetch() calls happen in the /radio page itself, same split as every
 * other client-facing data source in this app.
 */

export const RADIO_BROWSER_BASE_URL = "https://de1.api.radio-browser.info";

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  favicon: string;
  country: string;
  tags: string[];
  bitrate: number;
}

export interface RadioStationFilters {
  name?: string;
  country?: string;
  tag?: string;
  limit?: number;
}

/** Builds the search URL for /json/stations/search — sorted by popularity, broken streams excluded. */
export function buildStationsSearchUrl(filters: RadioStationFilters): string {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.country) params.set("country", filters.country);
  if (filters.tag) params.set("tag", filters.tag);
  params.set("limit", String(filters.limit ?? 30));
  params.set("hidebroken", "true");
  params.set("order", "clickcount");
  params.set("reverse", "true");
  return `${RADIO_BROWSER_BASE_URL}/json/stations/search?${params.toString()}`;
}

export function buildTopCountriesUrl(limit: number = 40): string {
  return `${RADIO_BROWSER_BASE_URL}/json/countries?order=stationcount&reverse=true&limit=${limit}`;
}

export function buildTopTagsUrl(limit: number = 40): string {
  return `${RADIO_BROWSER_BASE_URL}/json/tags?order=stationcount&reverse=true&limit=${limit}`;
}

interface RawStation {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  favicon?: string;
  country?: string;
  tags?: string;
  bitrate?: number;
}

/** A station missing a resolved stream URL or a name is unusable — dropped rather than shown broken. */
export function parseStation(raw: RawStation): RadioStation | null {
  if (!raw.url_resolved || !raw.name || !raw.stationuuid) return null;
  return {
    id: raw.stationuuid,
    name: raw.name,
    streamUrl: raw.url_resolved,
    favicon: raw.favicon ?? "",
    country: raw.country ?? "",
    tags: raw.tags
      ? raw.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    bitrate: raw.bitrate ?? 0,
  };
}

export function parseStations(raw: RawStation[]): RadioStation[] {
  return raw.map(parseStation).filter((s): s is RadioStation => s !== null);
}

export interface RadioFacet {
  name: string;
  count: number;
}

interface RawFacet {
  name?: string;
  stationcount?: number;
}

/** Shared shape for /json/countries and /json/tags responses — both are {name, stationcount}[]. Blank facet names are dropped. */
export function parseFacets(raw: RawFacet[]): RadioFacet[] {
  return raw
    .filter((f): f is Required<RawFacet> => Boolean(f.name))
    .map((f) => ({ name: f.name, count: f.stationcount ?? 0 }));
}
