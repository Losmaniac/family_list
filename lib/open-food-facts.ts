/**
 * Client-side helpers for the free, keyless Open Food Facts API
 * (openfoodfacts.org) — product/nutrition lookup, CORS-enabled for direct
 * browser fetches. Informational only for the Vzdělání "Potraviny"
 * section, no XP/quiz involved. Only URL building and response-shaping
 * live here (pure, testable); the actual fetch() calls happen in
 * components/FoodFactsExplorer.tsx.
 *
 * Two different services, on purpose:
 * - Text search goes through search.openfoodfacts.org (search-a-licious,
 *   their current dedicated search service) — but via our own
 *   /api/food-search proxy, not directly: that host responds fine to a
 *   plain server-side fetch but never sends Access-Control-Allow-Origin,
 *   so a direct browser fetch() was silently blocked by CORS (every
 *   search failed, not just intermittently). The older cgi/search.pl and
 *   world.openfoodfacts.org/api/v2/search endpoints do have CORS but
 *   intermittently return 503 "Page temporarily unavailable" under normal
 *   load — that's what "Potraviny se nepodařilo najít / load failed" was
 *   before the switch to search-a-licious.
 * - A single barcode lookup goes through world.openfoodfacts.org's v2
 *   product endpoint directly instead — it does send proper CORS headers,
 *   is a plain by-ID read rather than a search-cluster query so it's
 *   reliable in practice, and happens to return a ready-made image URL,
 *   unlike search-a-licious (see buildThumbnailUrl).
 *
 * Coverage isn't limited to any one country — it's a global, crowd-sourced
 * database (mostly OpenStreetMap-style community contributions), and
 * Czech products are well represented in practice (e.g. "Selský jogurt",
 * Kofola, …), just not guaranteed for any specific item.
 */

/** Same-origin proxy (app/api/food-search) — see the module doc for why this can't call search.openfoodfacts.org directly. */
export const FOOD_SEARCH_URL = "/api/food-search";
export const FOOD_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

const PRODUCT_FIELDS = "code,product_name,brands,nutriscore_grade,nutriments,image_front_small_url";

export function buildFoodSearchUrl(query: string): string {
  const params = new URLSearchParams({ q: query });
  return `${FOOD_SEARCH_URL}?${params.toString()}`;
}

export function buildBarcodeLookupUrl(barcode: string): string {
  const params = new URLSearchParams({ fields: PRODUCT_FIELDS });
  return `${FOOD_PRODUCT_URL}/${encodeURIComponent(barcode)}.json?${params.toString()}`;
}

export interface FoodProduct {
  id: string;
  name: string;
  brand: string;
  /** A-E, uppercase; empty when the product has no Nutri-Score. */
  nutriScore: string;
  image: string;
  energyKcal: number | null;
  sugars: number | null;
  fat: number | null;
  proteins: number | null;
  salt: number | null;
}

interface RawNutriments {
  "energy-kcal_100g"?: number;
  sugars_100g?: number;
  fat_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
}

function parseNutriments(n: RawNutriments | undefined) {
  return {
    energyKcal: n?.["energy-kcal_100g"] ?? null,
    sugars: n?.sugars_100g ?? null,
    fat: n?.fat_100g ?? null,
    proteins: n?.proteins_100g ?? null,
    salt: n?.salt_100g ?? null,
  };
}

function parseNutriScore(grade: string | undefined): string {
  return grade && grade !== "unknown" ? grade.toUpperCase() : "";
}

/** The 3/3/3/rest folder split Open Food Facts stores product images under. */
function imageFolderPath(code: string): string {
  return code.length <= 8 ? code : `${code.slice(0, 3)}/${code.slice(3, 6)}/${code.slice(6, 9)}/${code.slice(9)}`;
}

interface RawSearchHit {
  code?: string;
  product_name?: string;
  brands?: string[];
  nutriscore_grade?: string;
  nutriments?: RawNutriments;
  /** Keyed by image id — numeric ids ("1", "2", …) are the raw uploads; picking the lowest avoids guessing at the "front_en" selected-image filename, which includes a revision number this response doesn't expose. */
  images?: Record<string, unknown>;
}

interface RawSearchResponse {
  hits?: RawSearchHit[];
}

function buildThumbnailUrl(code: string, images: Record<string, unknown> | undefined): string {
  const imageId = Object.keys(images ?? {})
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b))[0];
  return imageId ? `https://images.openfoodfacts.org/images/products/${imageFolderPath(code)}/${imageId}.100.jpg` : "";
}

/** Entries missing a barcode or name are dropped — nothing usable to show. */
export function parseFoodSearchResults(raw: RawSearchResponse): FoodProduct[] {
  return (raw.hits ?? [])
    .filter((h): h is RawSearchHit & { code: string; product_name: string } => Boolean(h.code && h.product_name))
    .map((h) => ({
      id: h.code,
      name: h.product_name,
      brand: h.brands?.join(", ") ?? "",
      nutriScore: parseNutriScore(h.nutriscore_grade),
      image: buildThumbnailUrl(h.code, h.images),
      ...parseNutriments(h.nutriments),
    }));
}

interface RawProductLookup {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    nutriscore_grade?: string;
    image_front_small_url?: string;
    nutriments?: RawNutriments;
  };
}

/** null when the barcode isn't in the database (status !== 1) or the response is missing required fields. */
export function parseBarcodeLookup(raw: RawProductLookup): FoodProduct | null {
  const p = raw.product;
  if (raw.status !== 1 || !p?.code || !p.product_name) return null;
  return {
    id: p.code,
    name: p.product_name,
    brand: p.brands ?? "",
    nutriScore: parseNutriScore(p.nutriscore_grade),
    image: p.image_front_small_url ?? "",
    ...parseNutriments(p.nutriments),
  };
}
