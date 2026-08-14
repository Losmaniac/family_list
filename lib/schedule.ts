/** Pure helpers for the "Rozvrh hodin" (class schedule) card. */
import type { ScheduleCell } from "./types";

export const SCHEDULE_DAY_LABELS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek"];
export const SCHEDULE_DAY_SHORT_LABELS = ["Po", "Út", "St", "Čt", "Pá"];
export const SCHEDULE_MAX_PERIODS = 9;

/** Standard Czech elementary-school bell schedule (45-minute periods) — shown as a fixed header row, not stored per family. */
export const SCHEDULE_PERIOD_TIMES = [
  "7:00 – 7:45",
  "8:00 – 8:45",
  "8:55 – 9:40",
  "10:00 – 10:45",
  "10:55 – 11:40",
  "11:50 – 12:35",
  "12:45 – 13:30",
  "13:30 – 14:10",
  "14:20 – 15:00",
];

export function emptyScheduleCell(): ScheduleCell {
  return { subject: "" };
}

export function emptyScheduleDays(): ScheduleCell[][] {
  return Array.from({ length: SCHEDULE_DAY_LABELS.length }, () => Array.from({ length: SCHEDULE_MAX_PERIODS }, emptyScheduleCell));
}

/** A cell saved before teacher names existed is a bare subject string — upgrades it to the current shape. */
function normalizeCell(cell: ScheduleCell | string | undefined): ScheduleCell {
  if (cell === undefined) return emptyScheduleCell();
  return typeof cell === "string" ? { subject: cell } : cell;
}

/**
 * Normalizes a stored `days` map to always produce exactly
 * SCHEDULE_DAY_LABELS.length days of SCHEDULE_MAX_PERIODS periods each —
 * a schedule saved before the period count changed, or missing entirely,
 * still renders as a full grid instead of crashing on a short array.
 */
export function normalizeScheduleDays(days: Record<string, (ScheduleCell | string)[]> | undefined): ScheduleCell[][] {
  const base = emptyScheduleDays();
  if (!days) return base;
  return base.map((periods, dayIndex) => periods.map((_, periodIndex) => normalizeCell(days[String(dayIndex)]?.[periodIndex])));
}

/**
 * Firestore rejects an array whose elements are themselves arrays ("nested
 * arrays are not supported"), so the UI's ScheduleCell[][] grid is converted
 * to a day-index-keyed map before every write — see ClassSchedule in
 * lib/types.ts.
 */
export function daysToFirestoreMap(days: ScheduleCell[][]): Record<string, ScheduleCell[]> {
  const map: Record<string, ScheduleCell[]> = {};
  days.forEach((periods, dayIndex) => {
    map[String(dayIndex)] = periods;
  });
  return map;
}
