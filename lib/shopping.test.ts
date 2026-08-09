import { describe, expect, it } from "vitest";
import { DEFAULT_SHOPPING_CATEGORIES, effectiveShoppingCategories } from "./shopping";

describe("effectiveShoppingCategories", () => {
  it("falls back to the built-in defaults when a family hasn't set any", () => {
    expect(effectiveShoppingCategories(undefined)).toBe(DEFAULT_SHOPPING_CATEGORIES);
    expect(effectiveShoppingCategories([])).toBe(DEFAULT_SHOPPING_CATEGORIES);
  });

  it("uses the family's own categories when set", () => {
    const custom = ["Ovoce", "Maso"];
    expect(effectiveShoppingCategories(custom)).toBe(custom);
  });
});
