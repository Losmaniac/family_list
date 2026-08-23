import { describe, expect, it } from "vitest";
import { aggregateIngredients, parseIngredientLines } from "./meal-plan";

describe("aggregateIngredients", () => {
  it("merges the same ingredient across recipes case/whitespace-insensitively", () => {
    const result = aggregateIngredients([
      { ingredients: ["Vejce", "Mouka 500 g"] },
      { ingredients: [" vejce ", "Mléko"] },
    ]);
    expect(result).toEqual([
      { name: "Vejce", count: 2 },
      { name: "Mouka 500 g", count: 1 },
      { name: "Mléko", count: 1 },
    ]);
  });

  it("drops blank ingredient lines", () => {
    expect(aggregateIngredients([{ ingredients: ["Sůl", "  ", ""] }])).toEqual([
      { name: "Sůl", count: 1 },
    ]);
  });

  it("returns an empty array for no recipes", () => {
    expect(aggregateIngredients([])).toEqual([]);
  });
});

describe("parseIngredientLines", () => {
  it("splits on newlines, trims, and drops blank lines", () => {
    expect(parseIngredientLines("Vejce\n  Mouka 500 g \n\nMléko\n")).toEqual([
      "Vejce",
      "Mouka 500 g",
      "Mléko",
    ]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseIngredientLines("   \n\n")).toEqual([]);
  });
});
