/**
 * Generování dailyTasks z aktivních taskTemplates. Volané denně cronem
 * (functions/src/dailyTaskGenerator.ts) — dailyTasks se negenerují dopředu.
 * Také použito při vytvoření/úpravě šablony, aby se úkol na dnešek objevil
 * ihned (functions/src/onTaskTemplateWritten.ts), ne až po půlnoci.
 */
import type { DailyTask, TaskTemplate } from "./types";

export function dailyTaskId(date: string, templateId: string, userId: string): string {
  return `${date}_${templateId}_${userId}`;
}

export function isDue(template: TaskTemplate, date: Date): boolean {
  if (!template.active) return false;
  if (template.recurrence === "once") {
    return template.date === date.toISOString().slice(0, 10);
  }
  if (template.recurrence === "daily") return true;
  if (template.recurrence === "weekly" || template.recurrence === "custom") {
    return template.daysOfWeek.includes(date.getDay());
  }
  return false;
}

export function generateDailyTasks(
  templates: TaskTemplate[],
  date: Date
): Omit<DailyTask, "id">[] {
  const dateKey = date.toISOString().slice(0, 10);
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
