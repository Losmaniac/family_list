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
 * Capital/continent/language/currency names come through in English (the
 * dataset has no full Czech localization for those fields) — the country
 * name itself prefers the Czech translation when the dataset provides one.
 * Flag images aren't part of this dataset at all, so they're built
 * separately from the country's ISO code via flagcdn.com (also free and
 * keyless).
 */

export const COUNTRIES_DATA_URL = "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json";

export interface AtlasCountry {
  id: string;
  name: string;
  /** International/English capital name as the dataset gives it — see formatCapital() for the Czech-first display label. */
  capital: string;
  continent: string;
  subregion: string;
  /** SVG flag URL, built from the country's ISO code via flagcdn.com. */
  flag: string;
  areaKm2: number;
  languages: string[];
  currencies: string[];
  /** Names of bordering countries (Czech translation when available), empty for islands/countries with no land border. */
  neighbors: string[];
}

interface RawCountry {
  cca2?: string;
  cca3?: string;
  name?: { common?: string };
  capital?: string[];
  region?: string;
  subregion?: string;
  translations?: { ces?: { common?: string } };
  area?: number;
  languages?: Record<string, string>;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  borders?: string[];
}

export function parseCountries(raw: RawCountry[]): AtlasCountry[] {
  const nameByCca3 = new Map<string, string>();
  for (const c of raw) {
    if (c.cca3) nameByCca3.set(c.cca3, c.translations?.ces?.common ?? c.name?.common ?? c.cca3);
  }

  return raw
    .filter((c): c is RawCountry & { cca2: string; name: { common: string }; region: string } =>
      Boolean(c.cca2 && c.name?.common && c.region)
    )
    .map((c) => ({
      id: c.cca2,
      name: c.translations?.ces?.common ?? c.name.common,
      capital: c.capital?.[0] ?? "—",
      continent: c.region,
      subregion: c.subregion ?? "",
      flag: `https://flagcdn.com/${c.cca2.toLowerCase()}.svg`,
      areaKm2: c.area ?? 0,
      languages: c.languages ? Object.values(c.languages) : [],
      currencies: c.currencies
        ? Object.values(c.currencies)
            .map((cur) => (cur.name ? (cur.symbol ? `${cur.name} (${cur.symbol})` : cur.name) : ""))
            .filter(Boolean)
        : [],
      neighbors: c.borders?.map((b) => nameByCca3.get(b) ?? b) ?? [],
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

/**
 * Well-known Czech exonyms for capital cities (the dataset only localizes
 * country names, not capitals). Deliberately not exhaustive — capitals
 * missing here are simply shown under their international name, which is
 * correct for the many capitals that don't have a distinct Czech form.
 */
const CAPITAL_NAME_CS: Record<string, string> = {
  London: "Londýn",
  Paris: "Paříž",
  Rome: "Řím",
  Vienna: "Vídeň",
  Warsaw: "Varšava",
  Moscow: "Moskva",
  Lisbon: "Lisabon",
  Athens: "Atény",
  Brussels: "Brusel",
  Copenhagen: "Kodaň",
  Helsinki: "Helsinky",
  Budapest: "Budapešť",
  Bucharest: "Bukurešť",
  Sofia: "Sofie",
  Belgrade: "Bělehrad",
  Zagreb: "Záhřeb",
  Ljubljana: "Lublaň",
  Kyiv: "Kyjev",
  Chisinau: "Kišiněv",
  Pristina: "Priština",
  Monaco: "Monako",
  "Vatican City": "Vatikán",
  Nicosia: "Nikósie",
  Luxembourg: "Lucemburk",
  Beijing: "Peking",
  Tokyo: "Tokio",
  Seoul: "Soul",
  Pyongyang: "Pchjongjang",
  "New Delhi": "Nové Dillí",
  Islamabad: "Islámábád",
  Kathmandu: "Káthmándú",
  Dhaka: "Dháka",
  Colombo: "Kolombo",
  Hanoi: "Hanoj",
  "Phnom Penh": "Phnompenh",
  Singapore: "Singapur",
  Ulaanbaatar: "Ulánbátar",
  Taipei: "Tchaj-pej",
  Kabul: "Kábul",
  Tehran: "Teherán",
  Baghdad: "Bagdád",
  Riyadh: "Rijád",
  "Sana'a": "Saná",
  Muscat: "Maskat",
  "Abu Dhabi": "Abú Zabí",
  Doha: "Dauhá",
  Manama: "Manáma",
  "Kuwait City": "Kuvajt",
  Amman: "Ammán",
  Beirut: "Bejrút",
  Damascus: "Damašek",
  Jerusalem: "Jeruzalém",
  Yerevan: "Jerevan",
  Tashkent: "Taškent",
  Bishkek: "Biškek",
  Dushanbe: "Dušanbe",
  Ashgabat: "Ašchabad",
  Cairo: "Káhira",
  Tripoli: "Tripolis",
  Algiers: "Alžír",
  Khartoum: "Chartúm",
  "Addis Ababa": "Addis Abeba",
  Mogadishu: "Mogadišo",
  Djibouti: "Džibuti",
  Accra: "Akkra",
  Ouagadougou: "Uagadugu",
  Conakry: "Konakry",
  "N'Djamena": "Ndžamena",
  Nouakchott: "Nuakšott",
  "Mexico City": "Mexiko",
  Havana: "Havana",
};

/** "Praha (Prague)" — Czech name first, international name in parentheses; falls back to just the international name when there's no distinct Czech exonym. */
export function formatCapital(capital: string): string {
  const cs = CAPITAL_NAME_CS[capital];
  if (!cs || cs === capital) return capital;
  return `${cs} (${capital})`;
}
