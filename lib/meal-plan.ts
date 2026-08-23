/** Pure helpers for "Jídelníček" (meal planning) — the /lists tab that lets a parent pick next week's meals and turns their ingredients into shopping-list items. */
import type { Recipe } from "./types";

export interface AggregatedIngredient {
  /** As first seen across the selected recipes — casing/spacing preserved for display. */
  name: string;
  /** How many of the selected recipes call for this ingredient (matched by trimmed/lowercased name, not summed quantities — ingredients are plain free-text lines, same as a shopping item's name). */
  count: number;
}

/**
 * Merges ingredient lines across every selected recipe, case/whitespace-
 * insensitively, so "Vejce" in one recipe and "vejce " in another count as
 * the same ingredient (count: 2) instead of two separate shopping-list
 * entries. Order follows first appearance across the given recipes.
 */
export function aggregateIngredients(
  recipes: Pick<Recipe, "ingredients">[],
): AggregatedIngredient[] {
  const byKey = new Map<string, AggregatedIngredient>();
  for (const recipe of recipes) {
    for (const raw of recipe.ingredients) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = byKey.get(key);
      if (existing) existing.count += 1;
      else byKey.set(key, { name, count: 1 });
    }
  }
  return [...byKey.values()];
}

/** Splits a textarea's worth of "one ingredient per line" into a clean array — blank lines dropped, each line trimmed. */
export function parseIngredientLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
