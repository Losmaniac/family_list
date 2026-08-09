/**
 * "Zeměpis" (Atlas) quiz questions — shows a country name, asks for its
 * capital or continent. Source data comes from the free mledoze/countries
 * dataset (see lib/atlas.ts), fetched here (server-side) so the correct
 * answer is never trusted from the client, same principle as every other
 * Vzdělání subject. The fetched list is cached in memory for the life of
 * the function instance (refreshed at most once a day) instead of hitting
 * the external source on every single question — country data changes
 * essentially never.
 */
import { COUNTRIES_DATA_URL, parseCountries, type AtlasCountry } from "../../lib/atlas";

let cachedCountries: AtlasCountry[] = [];
let cachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getCountries(): Promise<AtlasCountry[]> {
  if (cachedCountries.length > 0 && Date.now() - cachedAt < CACHE_TTL_MS) return cachedCountries;
  try {
    const res = await fetch(COUNTRIES_DATA_URL);
    if (!res.ok) throw new Error(`Countries dataset HTTP ${res.status}`);
    const raw = (await res.json()) as Parameters<typeof parseCountries>[0];
    cachedCountries = parseCountries(raw);
    cachedAt = Date.now();
  } catch (err) {
    // Serve stale data rather than fail the whole request on a transient
    // upstream error — only rethrow if we have nothing cached at all.
    if (cachedCountries.length === 0) throw err;
  }
  return cachedCountries;
}

export interface AtlasQuestion {
  id: string;
  question: string;
  answer: string;
  /** Never set for atlas questions — declared so this stays structurally assignable to lib/practice.ts's PracticeProblem. */
  options?: [string, string, string];
  explanation?: string;
}

/** `excludeIds` (country cca2 codes) keeps already-correctly-answered countries out of the draw. */
export async function pickRandomAtlasQuestion(
  excludeIds: Set<string>,
  random: () => number = Math.random
): Promise<AtlasQuestion | undefined> {
  const countries = await getCountries();
  const pool = countries.filter((c) => !excludeIds.has(c.id));
  if (pool.length === 0) return undefined;

  const country = pool[Math.floor(random() * pool.length)];
  const askCapital = random() < 0.5;
  return askCapital
    ? { id: country.id, question: `Jaké je hlavní město státu ${country.name}?`, answer: country.capital }
    : { id: country.id, question: `Na kterém světadíle leží stát ${country.name}?`, answer: country.continent };
}
