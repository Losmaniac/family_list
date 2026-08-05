/**
 * Generování dailyTasks z aktivních taskTemplates. Volané denně cronem
 * (functions/src/dailyTaskGenerator.ts) — dailyTasks se negenerují dopředu.
 * Také použito při vytvoření/úpravě šablony, aby se úkol na dnešek objevil
 * ihned (functions/src/onTaskTemplateWritten.ts), ne až po půlnoci.
 */
import type { DailyTask, TaskTemplate } from "./types";
import {
  dateKeyInFamilyZone,
  dayOfMonthInFamilyZone,
  dayOfWeekInFamilyZone,
  lastDayOfMonthInFamilyZone,
} from "./date-utils";

export function dailyTaskId(date: string, templateId: string, userId: string): string {
  return `${date}_${templateId}_${userId}`;
}

export function isDue(template: TaskTemplate, date: Date): boolean {
  if (!template.active) return false;
  if (template.recurrence === "once") {
    return template.date === dateKeyInFamilyZone(date);
  }
  if (template.recurrence === "daily") return true;
  if (template.recurrence === "weekly" || template.recurrence === "custom") {
    return template.daysOfWeek.includes(dayOfWeekInFamilyZone(date));
  }
  if (template.recurrence === "monthly") {
    if (!template.dayOfMonth) return false;
    // Clamp to the month's last day so e.g. "day 31" still fires in a
    // 30-day month instead of silently never triggering that month.
    const targetDay = Math.min(template.dayOfMonth, lastDayOfMonthInFamilyZone(date));
    return dayOfMonthInFamilyZone(date) === targetDay;
  }
  return false;
}

export function generateDailyTasks(
  templates: TaskTemplate[],
  date: Date
): Omit<DailyTask, "id">[] {
  const dateKey = dateKeyInFamilyZone(date);
  const tasks: Omit<DailyTask, "id">[] = [];

  for (const template of templates) {
    if (!isDue(template, date)) continue;
    for (const assignee of template.assignedTo) {
      tasks.push({
        templateId: template.id,
        assignedTo: assignee,
        date: dateKey,
        status: "pending",
      });
    }
  }

  return tasks;
}
