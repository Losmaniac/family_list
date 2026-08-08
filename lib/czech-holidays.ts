/**
 * Czech public holidays ("dny pracovního klidu") — used to highlight them
 * on the planning calendar alongside weekends. Most are fixed calendar
 * dates, but Good Friday/Easter Monday move every year with Easter, so
 * those are computed rather than hardcoded (keeps this correct for any
 * year the calendar is navigated to, not just the ones someone remembered
 * to list).
 */

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Easter Sunday for the given year (Gregorian calendar) — Meeus/Jones/Butcher algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const FIXED_HOLIDAYS: { month: number; day: number; label: string }[] = [
  { month: 1, day: 1, label: "Nový rok" },
  { month: 5, day: 1, label: "Svátek práce" },
  { month: 5, day: 8, label: "Den vítězství" },
  { month: 7, day: 5, label: "Cyril a Metoděj" },
  { month: 7, day: 6, label: "Mistr Jan Hus" },
  { month: 9, day: 28, label: "Den české státnosti" },
  { month: 10, day: 28, label: "Vznik samostatného československého státu" },
  { month: 11, day: 17, label: "Den boje za svobodu a demokracii" },
  { month: 12, day: 24, label: "Štědrý den" },
  { month: 12, day: 25, label: "1. svátek vánoční" },
  { month: 12, day: 26, label: "2. svátek vánoční" },
];

/** Date-key ("YYYY-MM-DD") → holiday name, for every Czech public holiday in the given year. */
export function czechHolidaysForYear(year: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of FIXED_HOLIDAYS) {
    map.set(localDateKey(new Date(year, h.month - 1, h.day)), h.label);
  }

  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  map.set(localDateKey(goodFriday), "Velký pátek");
  map.set(localDateKey(easterMonday), "Velikonoční pondělí");

  return map;
}

/** The holiday name for the given date, or undefined if it isn't one. */
export function czechHolidayName(date: Date): string | undefined {
  return czechHolidaysForYear(date.getFullYear()).get(localDateKey(date));
}
