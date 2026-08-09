/** Pure helpers for the "Rozvrh hodin" (class schedule) card. */

export const SCHEDULE_DAY_LABELS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek"];
export const SCHEDULE_DAY_SHORT_LABELS = ["Po", "Út", "St", "Čt", "Pá"];
export const SCHEDULE_MAX_PERIODS = 9;

export function emptyScheduleDays(): string[][] {
  return Array.from({ length: SCHEDULE_DAY_LABELS.length }, () => Array(SCHEDULE_MAX_PERIODS).fill(""));
}

/**
 * Normalizes a stored `days` array to always have exactly
 * SCHEDULE_DAY_LABELS.length days of SCHEDULE_MAX_PERIODS periods each —
 * a schedule saved before the period count changed, or missing entirely,
 * still renders as a full grid instead of crashing on a short array.
 */
export function normalizeScheduleDays(days: string[][] | undefined): string[][] {
  const base = emptyScheduleDays();
  if (!days) return base;
  return base.map((periods, dayIndex) => periods.map((_, periodIndex) => days[dayIndex]?.[periodIndex] ?? ""));
}
