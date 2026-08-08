import type { CalendarEventCategory } from "./types";

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
