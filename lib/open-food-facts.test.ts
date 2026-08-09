import { describe, expect, it } from "vitest";
import { buildBarcodeLookupUrl, buildFoodSearchUrl, FOOD_PRODUCT_URL, FOOD_SEARCH_URL, parseBarcodeLookup, parseFoodSearchResults } from "./open-food-facts";

describe("buildFoodSearchUrl", () => {
  it("builds a search-a-licious URL with the query", () => {
    const url = buildFoodSearchUrl("jogurt");
    expect(url).toContain(FOOD_SEARCH_URL);
    expect(url).toContain("q=jogurt");
  });
});

describe("buildBarcodeLookupUrl", () => {
  it("builds a v2 product-by-barcode URL", () => {
    const url = buildBarcodeLookupUrl("3838900942505");
    expect(url).toBe(
      `${FOOD_PRODUCT_URL}/3838900942505.json?fields=code%2Cproduct_name%2Cbrands%2Cnutriscore_grade%2Cnutriments%2Cimage_front_small_url`
    );
  });

  it("URL-encodes the barcode", () => {
    expect(buildBarcodeLookupUrl("a/b")).toContain("a%2Fb.json");
  });
});

describe("parseFoodSearchResults", () => {
  it("parses a well-formed hit, joining a multi-brand array", () => {
    const products = parseFoodSearchResults({
      hits: [
        {
          code: "123",
          product_name: "Bílý jogurt",
          brands: ["Znojmia", "Moravia"],
          nutriscore_grade: "b",
          images: { "2": {}, "1": {} },
          nutriments: { "energy-kcal_100g": 61, sugars_100g: 4.5, fat_100g: 3.5, proteins_100g: 3.7, salt_100g: 0.1 },
        },
      ],
    });
    expect(products).toEqual([
      {
        id: "123",
        name: "Bílý jogurt",
        brand: "Znojmia, Moravia",
        nutriScore: "B",
        image: "https://images.openfoodfacts.org/images/products/123/1.100.jpg",
        energyKcal: 61,
        sugars: 4.5,
        fat: 3.5,
        proteins: 3.7,
        salt: 0.1,
      },
    ]);
  });

  it("splits a long barcode into the 3/3/3/rest image folder path", () => {
    const products = parseFoodSearchResults({
      hits: [{ code: "3838900942505", product_name: "X", images: { "1": {} } }],
    });
    expect(products[0].image).toBe("https://images.openfoodfacts.org/images/products/383/890/094/2505/1.100.jpg");
  });

  it("drops hits missing a code or name, and leaves image blank when there's no numeric image id", () => {
    const products = parseFoodSearchResults({
      hits: [{ product_name: "No code" }, { code: "1" }, { code: "2", product_name: "No images", images: { front_en: {} } }],
    });
    expect(products).toHaveLength(1);
    expect(products[0].image).toBe("");
  });

  it("treats an 'unknown' nutriscore as no score", () => {
    const products = parseFoodSearchResults({ hits: [{ code: "1", product_name: "X", nutriscore_grade: "unknown" }] });
    expect(products[0].nutriScore).toBe("");
  });

  it("defaults missing nutriments to null and handles no hits at all", () => {
    const products = parseFoodSearchResults({ hits: [{ code: "1", product_name: "X" }] });
    expect(products[0]).toMatchObject({ energyKcal: null, sugars: null, fat: null, proteins: null, salt: null });
    expect(parseFoodSearchResults({})).toEqual([]);
  });
});

describe("parseBarcodeLookup", () => {
  it("parses a found product", () => {
    const product = parseBarcodeLookup({
      status: 1,
      product: {
        code: "3838900942505",
        product_name: "Jogurt",
        brands: "Mercator",
        nutriscore_grade: "b",
        image_front_small_url: "https://images.openfoodfacts.org/images/products/383/890/094/2505/front_en.4.200.jpg",
        nutriments: { "energy-kcal_100g": 59, sugars_100g: 4.3, fat_100g: 3.2, proteins_100g: 3.3, salt_100g: 0.1 },
      },
    });
    expect(product).toEqual({
      id: "3838900942505",
      name: "Jogurt",
      brand: "Mercator",
      nutriScore: "B",
      image: "https://images.openfoodfacts.org/images/products/383/890/094/2505/front_en.4.200.jpg",
      energyKcal: 59,
      sugars: 4.3,
      fat: 3.2,
      proteins: 3.3,
      salt: 0.1,
    });
  });

  it("returns null when the barcode isn't found (status 0)", () => {
    expect(parseBarcodeLookup({ status: 0 })).toBeNull();
  });

  it("returns null when the product is missing required fields", () => {
    expect(parseBarcodeLookup({ status: 1, product: { code: "1" } })).toBeNull();
  });
});
