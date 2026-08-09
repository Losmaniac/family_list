/**
 * Client-side helpers for the free, keyless svatkyapi.cz API — today's
 * Czech calendar date, name day ("svátek"), and whether it's a public
 * holiday, CORS-enabled for direct browser fetches. Only URL building and
 * response-shaping live here (pure, testable); the actual fetch() call
 * happens in components/TodayDateBanner.tsx, same split as every other
 * external data source in this app.
 */

export const SVATKY_API_URL = "https://svatkyapi.cz/api/day";

export interface DayInfo {
  /** "9. srpna 2026" — day + genitive month + year, built from the API's numeric/genitive fields. */
  formattedDate: string;
  /** "Neděle" — capitalized weekday. */
  dayInWeek: string;
  /** Whoever's name day it is today, or null if the API has nothing for the date. */
  name: string | null;
  isHoliday: boolean;
  holidayName: string | null;
}

interface RawDay {
  dayNumber?: string;
  month?: { genitive?: string };
  year?: string;
  dayInWeek?: string;
  name?: string | null;
  isHoliday?: boolean;
  holidayName?: string | null;
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/** null when the response is missing the fields needed to build a date. */
export function parseDayInfo(raw: RawDay): DayInfo | null {
  if (!raw.dayNumber || !raw.month?.genitive || !raw.year) return null;
  return {
    formattedDate: `${raw.dayNumber}. ${raw.month.genitive} ${raw.year}`,
    dayInWeek: capitalize(raw.dayInWeek ?? ""),
    name: raw.name ?? null,
    isHoliday: raw.isHoliday ?? false,
    holidayName: raw.holidayName ?? null,
  };
}
