/**
 * Client-side helpers for the free, keyless World Bank API
 * (api.worldbank.org) — country economic/social indicators, CORS-enabled
 * for direct browser fetches. Only URL building and response-shaping live
 * here (pure, testable); the actual fetch() calls happen in
 * components/WorldBankExplorer.tsx.
 */

export const WORLD_BANK_BASE_URL = "https://api.worldbank.org/v2";

export interface WorldBankIndicator {
  id: string;
  label: string;
  /** How to render a raw numeric value, e.g. "$1.2B", "8.9M obyvatel". */
  format: (value: number) => string;
}

function formatBillionsUsd(value: number): string {
  return `${(value / 1_000_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mld. $`;
}

function formatMillions(value: number): string {
  return `${(value / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil.`;
}

function formatYears(value: number): string {
  return `${value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} let`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} %`;
}

/** A hand-picked subset of the thousands of World Bank indicators — the ones a curious kid can actually make sense of. */
export const WORLD_BANK_INDICATORS: WorldBankIndicator[] = [
  { id: "NY.GDP.MKTP.CD", label: "HDP (hrubý domácí produkt)", format: formatBillionsUsd },
  { id: "SP.POP.TOTL", label: "Počet obyvatel", format: formatMillions },
  { id: "SP.DYN.LE00.IN", label: "Očekávaná délka života", format: formatYears },
  { id: "SL.UEM.TOTL.ZS", label: "Nezaměstnanost", format: formatPercent },
];

/**
 * More detailed indicators, hidden behind a "show more" toggle so the
 * default view stays a short, digestible list for a kid — these are shown
 * only if the user asks for them.
 */
export const WORLD_BANK_EXTRA_INDICATORS: WorldBankIndicator[] = [
  { id: "FP.CPI.TOTL.ZG", label: "Inflace (meziroční růst cen)", format: formatPercent },
  { id: "IT.NET.USER.ZS", label: "Lidé používající internet", format: formatPercent },
  { id: "SE.PRM.ENRR", label: "Zápis do základní školy", format: formatPercent },
  { id: "NE.EXP.GNFS.ZS", label: "Vývoz zboží a služeb (podíl na HDP)", format: formatPercent },
  { id: "SH.XPD.CHEX.GD.ZS", label: "Výdaje na zdravotnictví (podíl na HDP)", format: formatPercent },
];

export function buildIndicatorUrl(countryCode: string, indicatorId: string): string {
  const params = new URLSearchParams({ format: "json", per_page: "20" });
  return `${WORLD_BANK_BASE_URL}/country/${encodeURIComponent(countryCode)}/indicator/${encodeURIComponent(indicatorId)}?${params.toString()}`;
}

export interface WorldBankCountry {
  code: string;
  name: string;
}

export function buildCountryListUrl(): string {
  const params = new URLSearchParams({ format: "json", per_page: "400" });
  return `${WORLD_BANK_BASE_URL}/country?${params.toString()}`;
}

interface RawCountry {
  id?: string;
  iso2Code?: string;
  name?: string;
  region?: { id?: string };
}

/** The country list endpoint also returns region/income aggregates (e.g. "World", "European Union") mixed in with real countries — those have region.id "NA", so this filters them out. */
export function parseCountryList(raw: unknown): WorldBankCountry[] {
  if (!Array.isArray(raw) || !Array.isArray(raw[1])) return [];
  const rows = raw[1] as RawCountry[];
  return rows
    .filter((row) => row.region?.id !== "NA" && row.iso2Code && row.name)
    .map((row) => ({ code: row.iso2Code as string, name: row.name as string }));
}

export interface IndicatorValue {
  year: string;
  value: number;
}

interface RawDataPoint {
  date?: string;
  value?: number | null;
}

/** The World Bank returns years newest-first with gaps (null) where data isn't published yet — this returns the first entry that actually has a value. */
export function parseIndicatorValue(raw: unknown): IndicatorValue | null {
  if (!Array.isArray(raw) || !Array.isArray(raw[1])) return null;
  const points = raw[1] as RawDataPoint[];
  const point = points.find((p) => typeof p.value === "number" && typeof p.date === "string");
  return point ? { year: point.date as string, value: point.value as number } : null;
}
