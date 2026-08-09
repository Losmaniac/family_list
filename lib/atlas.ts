/**
 * Country/capital/continent data for the Vzdělání "Zeměpis" subject —
 * browsable country-by-continent list plus the source data for the atlas
 * quiz (see functions/src/atlas.ts, which fetches and caches the same
 * shape server-side for the quiz's server-authoritative answer checking).
 * Only response-shaping lives here (pure, testable); fetch() calls happen
 * at each call site.
 *
 * Source: the mledoze/countries open dataset (the same one restcountries.com
 * itself used to be built from), served free and keyless off jsdelivr's CDN
 * — restcountries.com's own v3.1 API was retired in favor of a paid,
 * API-key-gated v5, so it's no longer usable here.
 *
 * Capital/continent names come through in English (the dataset has no full
 * Czech localization for those fields) — the country name itself prefers
 * the Czech translation when the dataset provides one. Flag images aren't
 * part of this dataset at all, so they're built separately from the
 * country's ISO code via flagcdn.com (also free and keyless).
 */

export const COUNTRIES_DATA_URL = "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json";

export interface AtlasCountry {
  id: string;
  name: string;
  capital: string;
  continent: string;
  /** SVG flag URL, built from the country's ISO code via flagcdn.com. */
  flag: string;
}

interface RawCountry {
  cca2?: string;
  name?: { common?: string };
  capital?: string[];
  region?: string;
  translations?: { ces?: { common?: string } };
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
      flag: `https://flagcdn.com/${c.cca2.toLowerCase()}.svg`,
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
