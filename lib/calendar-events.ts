import type { CalendarEvent, CalendarEventCategory, CalendarRecurrence } from "./types";

export const CALENDAR_EVENT_CATEGORIES: { value: CalendarEventCategory; label: string; icon: string }[] = [
  { value: "doctor", label: "Lékař", icon: "🩺" },
  { value: "birthday", label: "Narozeniny", icon: "🎂" },
  { value: "holiday", label: "Svátek", icon: "🎉" },
  { value: "vacation", label: "Dovolená", icon: "🏖️" },
  { value: "other", label: "Ostatní", icon: "📌" },
];

export function calendarEventCategoryInfo(category: CalendarEventCategory) {
  return (
    CALENDAR_EVENT_CATEGORIES.find((c) => c.value === category) ??
    CALENDAR_EVENT_CATEGORIES[CALENDAR_EVENT_CATEGORIES.length - 1]
  );
}

export const CALENDAR_RECURRENCES: { value: CalendarRecurrence; label: string }[] = [
  { value: "none", label: "Jednorázově" },
  { value: "weekly", label: "Týdně" },
  { value: "monthly", label: "Měsíčně" },
  { value: "yearly", label: "Ročně" },
];

/**
 * Whether a (possibly recurring) event falls on `dateKey` (YYYY-MM-DD).
 * Recurrence only ever looks forward from the event's own `date` — a
 * weekly/monthly/yearly event never shows up before the day it was created
 * for. String comparison of YYYY-MM-DD keys is chronological, so no Date
 * parsing is needed for the "before start" check.
 */
export function eventOccursOnDate(event: CalendarEvent, dateKey: string): boolean {
  if (dateKey === event.date) return true;
  if (dateKey < event.date) return false;
  const recurrence = event.recurrence ?? "none";
  if (recurrence === "none") {
    // A multi-day span (e.g. a vacation running from `date` through
    // `endDate`) — not a repeat pattern, just every day in between.
    return Boolean(event.endDate) && dateKey <= event.endDate!;
  }
  if (event.recurrenceUntil && dateKey > event.recurrenceUntil) return false;

  const [ey, em, ed] = event.date.split("-").map(Number);
  const [ty, tm, td] = dateKey.split("-").map(Number);
  const startUtc = Date.UTC(ey, em - 1, ed);
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((targetUtc - startUtc) / 86_400_000);

  switch (recurrence) {
    case "weekly":
      return diffDays % 7 === 0;
    case "monthly":
      return ed === td;
    case "yearly":
      return em === tm && ed === td;
    default:
      return false;
  }
}
