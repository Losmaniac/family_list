import { isDue } from "@/lib/task-scheduler";
import { categoryInfo } from "@/lib/categories";
import type { TaskTemplate } from "@/lib/types";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  result.setHours(0, 0, 0, 0);
  return result;
}

interface PersonalWeekAheadProps {
  templates: TaskTemplate[];
  userId: string;
}

/** Read-only week-ahead preview for a single member — no drag/drop, no daily task documents needed (those don't exist yet for future days), just a projection from active templates via isDue(). */
export default function PersonalWeekAhead({ templates, userId }: PersonalWeekAheadProps) {
  const monday = startOfWeek(new Date());
  const todayKey = new Date().toISOString().slice(0, 10);
  const myTemplates = templates.filter((t) => t.active && t.assignedTo.includes(userId));

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
      {weekDates.map((date, displayIndex) => {
        const dateKey = date.toISOString().slice(0, 10);
        const dueTemplates = myTemplates.filter((t) => isDue(t, date));
        const isToday = dateKey === todayKey;

        return (
          <div
            key={dateKey}
            className={`flex min-w-[80px] flex-col gap-1.5 rounded-lg border p-2 ${
              isToday ? "border-accent bg-accent/5" : "border-border"
            }`}
          >
            <p className={`text-xs font-semibold ${isToday ? "text-accent" : "text-zinc-500"}`}>
              {DAY_LABELS[displayIndex]} {date.getDate()}.
            </p>
            <div className="flex flex-col gap-1">
              {dueTemplates.map((template) => (
                <p key={template.id} className="truncate rounded-md bg-surface-muted px-1.5 py-1 text-xs">
                  {template.category && `${categoryInfo(template.category).icon} `}
                  {template.title}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
