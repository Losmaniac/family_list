/**
 * Shared favoriting logic for the Rádio/TV tabs on /media — both a
 * RadioStation and a TvChannel are just "something with an id", so toggling
 * a heart works identically for either without needing two near-identical
 * copies of the same add/remove logic.
 */

export function toggleFavorite<T extends { id: string }>(list: T[] | undefined, item: T): T[] {
  const current = list ?? [];
  return current.some((i) => i.id === item.id) ? current.filter((i) => i.id !== item.id) : [...current, item];
}

export function isFavorite<T extends { id: string }>(list: T[] | undefined, id: string): boolean {
  return (list ?? []).some((i) => i.id === id);
}
