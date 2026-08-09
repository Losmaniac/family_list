/** Pure helpers for the "Seznamy" card's non-shopping lists (wishlist, ideas, house how-tos, and any custom list a parent adds). */

import type { ListKind } from "./types";

export const LIST_KIND_LABELS: Record<ListKind, string> = {
  wishlist: "Přání",
  ideas: "Nápady na zlepšení",
  howto: "Návody pro chod domu",
  custom: "Vlastní seznam",
};

export const WISHLIST_CATEGORIES = ["Narozeniny", "Svátek", "Vánoce"];

/**
 * Built-in list presets a parent can one-tap-create from the "+ Přidat
 * seznam" form, alongside a fully custom one. Kept separate from
 * LIST_KIND_LABELS since "custom" isn't one of these (it's the free-text
 * fallback when no preset fits).
 */
export const LIST_PRESETS: { kind: ListKind; title: string; categories?: string[] }[] = [
  { kind: "wishlist", title: LIST_KIND_LABELS.wishlist, categories: WISHLIST_CATEGORIES },
  { kind: "ideas", title: LIST_KIND_LABELS.ideas },
  { kind: "howto", title: LIST_KIND_LABELS.howto },
];

/** Groups items by their `category`, in the given category order; anything with no matching category falls into a trailing "Ostatní" bucket. Returns a single unlabeled group when the list has no categories at all. */
export function groupItemsByCategory<T extends { category?: string }>(
  items: T[],
  categories: string[] | undefined
): { category: string | null; items: T[] }[] {
  if (!categories || categories.length === 0) {
    return items.length > 0 ? [{ category: null, items }] : [];
  }
  const grouped: { category: string | null; items: T[] }[] = categories
    .map((category) => ({ category, items: items.filter((i) => i.category === category) }))
    .filter((group) => group.items.length > 0);
  const uncategorized = items.filter((i) => !i.category || !categories.includes(i.category));
  if (uncategorized.length > 0) grouped.push({ category: "Ostatní", items: uncategorized });
  return grouped;
}
