/**
 * Client-side helpers for the free, keyless Sunrise and Sunset Times API
 * (sunrise-sunset.org, v2 JSON endpoint) — today's sunrise/sunset for a
 * fixed location (Fulnek, CZ), CORS-enabled for direct browser fetches.
 * Only URL building and response-shaping live here (pure, testable); the
 * actual fetch() happens in components/TodayDateBanner.tsx.
 */

export const SUNRISE_SUNSET_API_URL = "https://api.sunrise-sunset.org/json";

/** Fulnek, Czech Republic. */
export const FULNEK_COORDS = { latitude: 49.5833, longitude: 17.7 };

export function buildSunriseSunsetUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    date: "today",
    formatted: "0",
    tzid: "Europe/Prague",
  });
  return `${SUNRISE_SUNSET_API_URL}?${params.toString()}`;
}

export interface SunTimes {
  /** "5:29" — local (Europe/Prague) time. */
  sunrise: string;
  sunset: string;
}

interface RawResponse {
  status?: string;
  results?: { sunrise?: string; sunset?: string };
}

const sunTimeFormatter = new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", hour: "numeric", minute: "2-digit" });

/** null when the API reports anything other than status "OK", or is missing either time. */
export function parseSunTimes(raw: RawResponse): SunTimes | null {
  if (raw.status !== "OK" || !raw.results?.sunrise || !raw.results?.sunset) return null;
  return {
    sunrise: sunTimeFormatter.format(new Date(raw.results.sunrise)),
    sunset: sunTimeFormatter.format(new Date(raw.results.sunset)),
  };
}
