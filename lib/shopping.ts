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
