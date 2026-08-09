/** Pure helpers for the "Nákupní seznam" (shopping list) card. */

// Common grocery-store aisle groupings — same spirit as apps like Bring!/
// OurGroceries, which organize a list by category so it doubles as a
// rough shopping route. A parent can override this list per family.
export const DEFAULT_SHOPPING_CATEGORIES = [
  "Ovoce a zelenina",
  "Pečivo",
  "Mléčné výrobky",
  "Maso a ryby",
  "Mražené potraviny",
  "Trvanlivé potraviny",
  "Nápoje",
  "Drogerie",
  "Domácnost",
  "Ostatní",
];

export function effectiveShoppingCategories(customCategories: string[] | undefined): string[] {
  return customCategories && customCategories.length > 0 ? customCategories : DEFAULT_SHOPPING_CATEGORIES;
}

export const SHOPPING_MIN_QUANTITY = 1;
export const SHOPPING_MAX_QUANTITY = 99;

/** Keeps a quantity within [SHOPPING_MIN_QUANTITY, SHOPPING_MAX_QUANTITY] — used by every +/- stepper click, on both new and pre-existing items. */
export function clampQuantity(quantity: number): number {
  return Math.min(SHOPPING_MAX_QUANTITY, Math.max(SHOPPING_MIN_QUANTITY, Math.round(quantity)));
}
