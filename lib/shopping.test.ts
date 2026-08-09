import { describe, expect, it } from "vitest";
import {
  clampQuantity,
  DEFAULT_SHOPPING_CATEGORIES,
  effectiveShoppingCategories,
  SHOPPING_MAX_QUANTITY,
  SHOPPING_MIN_QUANTITY,
} from "./shopping";

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

describe("clampQuantity", () => {
  it("never goes below the minimum", () => {
    expect(clampQuantity(0)).toBe(SHOPPING_MIN_QUANTITY);
    expect(clampQuantity(-5)).toBe(SHOPPING_MIN_QUANTITY);
  });

  it("never exceeds the maximum", () => {
    expect(clampQuantity(1000)).toBe(SHOPPING_MAX_QUANTITY);
  });

  it("passes through an in-range value unchanged", () => {
    expect(clampQuantity(5)).toBe(5);
  });

  it("rounds a fractional value", () => {
    expect(clampQuantity(2.6)).toBe(3);
  });
});
