import { describe, expect, it } from "vitest";
import { buildFoodSearchUrl, OPEN_FOOD_FACTS_SEARCH_URL, parseFoodProducts } from "./open-food-facts";

describe("buildFoodSearchUrl", () => {
  it("builds a search URL with the query", () => {
    const url = buildFoodSearchUrl("jogurt");
    expect(url).toContain(OPEN_FOOD_FACTS_SEARCH_URL);
    expect(url).toContain("search_terms=jogurt");
    expect(url).toContain("json=1");
  });
});

describe("parseFoodProducts", () => {
  it("parses a well-formed product", () => {
    const products = parseFoodProducts([
      {
        code: "123",
        product_name: "Bílý jogurt",
        brands: "Znojmia",
        nutriscore_grade: "b",
        image_front_small_url: "https://images.example.com/1.jpg",
        nutriments: { "energy-kcal_100g": 61, sugars_100g: 4.5, fat_100g: 3.5, proteins_100g: 3.7, salt_100g: 0.1 },
      },
    ]);
    expect(products).toEqual([
      {
        id: "123",
        name: "Bílý jogurt",
        brand: "Znojmia",
        nutriScore: "B",
        image: "https://images.example.com/1.jpg",
        energyKcal: 61,
        sugars: 4.5,
        fat: 3.5,
        proteins: 3.7,
        salt: 0.1,
      },
    ]);
  });

  it("drops products with no code or no name", () => {
    const products = parseFoodProducts([{ product_name: "No code" }, { code: "1" }]);
    expect(products).toHaveLength(0);
  });

  it("treats an 'unknown' nutriscore as no score", () => {
    const products = parseFoodProducts([{ code: "1", product_name: "X", nutriscore_grade: "unknown" }]);
    expect(products[0].nutriScore).toBe("");
  });

  it("defaults missing nutriments to null", () => {
    const products = parseFoodProducts([{ code: "1", product_name: "X" }]);
    expect(products[0]).toMatchObject({ energyKcal: null, sugars: null, fat: null, proteins: null, salt: null });
  });
});
