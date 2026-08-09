/**
 * Country/capital/continent data from the free, keyless REST Countries API
 * (restcountries.com) for the Vzdělání "Zeměpis" subject — browsable
 * country-by-continent list plus the source data for the atlas quiz (see
 * functions/src/atlas.ts, which fetches and caches the same shape
 * server-side for the quiz's server-authoritative answer checking). Only
 * response-shaping lives here (pure, testable); fetch() calls happen at
 * each call site.
 *
 * Capital/continent names come through in English (REST Countries has no
 * full Czech localization for those fields) — the country name itself
 * prefers the Czech translation when the API provides one.
 */

export const REST_COUNTRIES_URL =
  "https://restcountries.com/v3.1/all?fields=name,capital,region,cca2,translations,flags";

export interface AtlasCountry {
  id: string;
  name: string;
  capital: string;
  continent: string;
  /** SVG flag URL, when the API provides one. */
  flag: string;
}

interface RawCountry {
  cca2?: string;
  name?: { common?: string };
  capital?: string[];
  region?: string;
  translations?: { ces?: { common?: string } };
  flags?: { svg?: string; png?: string };
}

export function parseCountries(raw: RawCountry[]): AtlasCountry[] {
  return raw
    .filter((c): c is RawCountry & { cca2: string; name: { common: string }; region: string } =>
      Boolean(c.cca2 && c.name?.common && c.region)
    )
    .map((c) => ({
      id: c.cca2,
      name: c.translations?.ces?.common ?? c.name.common,
      capital: c.capital?.[0] ?? "—",
      continent: c.region,
      flag: c.flags?.svg ?? c.flags?.png ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function groupByContinent(countries: AtlasCountry[]): Record<string, AtlasCountry[]> {
  const groups: Record<string, AtlasCountry[]> = {};
  for (const country of countries) {
    (groups[country.continent] ??= []).push(country);
  }
  return groups;
}
