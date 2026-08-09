/**
 * Client-side helpers for the free, keyless Open Food Facts API
 * (openfoodfacts.org) — product/nutrition lookup, CORS-enabled for direct
 * browser fetches. Informational only for the Vzdělání "Potraviny"
 * section, no XP/quiz involved. Only URL building and response-shaping
 * live here (pure, testable); the actual fetch() call happens in
 * components/FoodFactsExplorer.tsx.
 */

export const OPEN_FOOD_FACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

export function buildFoodSearchUrl(query: string): string {
  const params = new URLSearchParams({
    search_terms: query,
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,nutriscore_grade,image_front_small_url,nutriments",
  });
  return `${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`;
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

interface RawProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriscore_grade?: string;
  image_front_small_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    sugars_100g?: number;
    fat_100g?: number;
    proteins_100g?: number;
    salt_100g?: number;
  };
}

/** Products missing a name or barcode are dropped — nothing usable to show. */
export function parseFoodProducts(raw: RawProduct[]): FoodProduct[] {
  return raw
    .filter((p): p is RawProduct & { code: string; product_name: string } => Boolean(p.code && p.product_name))
    .map((p) => ({
      id: p.code,
      name: p.product_name,
      brand: p.brands ?? "",
      nutriScore: p.nutriscore_grade && p.nutriscore_grade !== "unknown" ? p.nutriscore_grade.toUpperCase() : "",
      image: p.image_front_small_url ?? "",
      energyKcal: p.nutriments?.["energy-kcal_100g"] ?? null,
      sugars: p.nutriments?.sugars_100g ?? null,
      fat: p.nutriments?.fat_100g ?? null,
      proteins: p.nutriments?.proteins_100g ?? null,
      salt: p.nutriments?.salt_100g ?? null,
    }));
}
