/**
 * Calendar-date helpers pinned to the family's time zone (Europe/Prague),
 * not the running process's zone. `Date#toISOString()`/`getDate()`/`getDay()`
 * read UTC or the host machine's local zone — for a browser that's usually
 * Prague, but Cloud Functions run in UTC, so the two disagree by a day for
 * part of every evening. Every "what date/weekday is it" check goes through
 * here instead so client and server always land on the same calendar day.
 */
const FAMILY_TIME_ZONE = "Europe/Prague";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function familyZoneParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FAMILY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    weekday: WEEKDAY_INDEX[byType.weekday],
  };
}

/** YYYY-MM-DD for the given instant, as a calendar date in Europe/Prague. */
export function dateKeyInFamilyZone(date: Date): string {
  const { year, month, day } = familyZoneParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Day of week (0=Sun..6=Sat) for the given instant, in Europe/Prague. */
export function dayOfWeekInFamilyZone(date: Date): number {
  return familyZoneParts(date).weekday;
}

/** Day of month (1-31) for the given instant, in Europe/Prague. */
export function dayOfMonthInFamilyZone(date: Date): number {
  return familyZoneParts(date).day;
}

/** Last day of the given instant's month (28-31), in Europe/Prague. */
export function lastDayOfMonthInFamilyZone(date: Date): number {
  const { year, month } = familyZoneParts(date);
  // Pure calendar arithmetic — day 0 of the next month is the last day of
  // this one. UTC methods here just avoid another host-zone dependency.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const dateTimeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: FAMILY_TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: FAMILY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** "5. 8. 2026 8:23" — full date + time for the given instant, in Europe/Prague. */
export function formatDateTimeInFamilyZone(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** "8:23" — time only for the given instant, in Europe/Prague. */
export function formatTimeInFamilyZone(date: Date): string {
  return timeFormatter.format(date);
}

/** Hour (0-23) for the given instant, in Europe/Prague. */
export function hourInFamilyZone(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: FAMILY_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).formatToParts(
    date
  );
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

/**
 * Whether `now` falls inside a [startHour, endHour) curfew window, in
 * Europe/Prague — e.g. isWithinCurfew(now, 22, 6) is true from 22:00
 * through 5:59, false 6:00-21:59. A window that wraps past midnight
 * (startHour > endHour) is handled the same as one that doesn't; equal
 * start/end hours mean no restriction at all rather than a full 24h block.
 */
export function isWithinCurfew(now: Date, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return false;
  const hour = hourInFamilyZone(now);
  return startHour < endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour;
}

/**
 * Calendar-grid helpers for month-view UIs (e.g. /family, /calendar).
 * Unlike the family-zone helpers above, these operate on plain calendar
 * dates already built from year/month/day components (e.g. `new Date(y, m,
 * d)`) rather than converting a real instant — there's no time-zone
 * conversion involved, just local Y/M/D arithmetic.
 */

/** The 1st of the given date's month, at local midnight. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Number of days (28-31) in the given date's month. */
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** The 1st of the month `delta` months away from the given date's month. */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Whether two dates fall on the same calendar day (ignores time-of-day). */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The Monday (local midnight) of the given date's week. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

/** The date `delta` days away from the given date (delta may be negative). */
export function addDays(date: Date, delta: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + delta);
  return result;
}
