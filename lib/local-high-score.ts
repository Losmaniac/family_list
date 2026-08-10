/** Reads a locally-stored arcade high score — SSR-safe (no `window` on the server) and shared by every game in components/games/. */
export function readHighScore(key: string): number {
  if (typeof window === "undefined") return 0;
  const stored = Number(localStorage.getItem(key) ?? 0);
  return Number.isFinite(stored) ? stored : 0;
}
