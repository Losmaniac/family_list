import { isDue } from "@/lib/task-scheduler";
import type { Member, TaskTemplate } from "@/lib/types";
import Avatar from "./Avatar";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const mondayOffset = (result.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
  result.setDate(result.getDate() - mondayOffset);
  result.setHours(0, 0, 0, 0);
  return result;
}

interface WeekScheduleProps {
  templates: TaskTemplate[];
  members: Member[];
}

export default function WeekSchedule({ templates, members }: WeekScheduleProps) {
  const monday = startOfWeek(new Date());
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const activeTemplates = templates.filter((t) => t.active);

  return (
    <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
      {weekDates.map((date, i) => {
        const dateKey = date.toISOString().slice(0, 10);
        const dueTemplates = activeTemplates.filter((t) => isDue(t, date));
        const isToday = dateKey === todayKey;

        return (
          <div
            key={dateKey}
            className={`flex min-w-[80px] flex-col gap-1.5 rounded-lg border p-2 ${
              isToday ? "border-accent bg-accent/5" : "border-border"
            }`}
          >
            <p className={`text-xs font-semibold ${isToday ? "text-accent" : "text-zinc-500"}`}>
              {DAY_LABELS[i]} {date.getDate()}.
            </p>
            <div className="flex flex-col gap-1">
              {dueTemplates.map((template) => (
                <div key={template.id} className="rounded-md bg-surface-muted px-1.5 py-1">
                  <p className="truncate text-xs font-medium">{template.title}</p>
                  <div className="mt-0.5 flex -space-x-1">
                    {template.assignedTo.map((userId) => {
                      const assignee = members.find((m) => m.id === userId);
                      if (!assignee) return null;
                      return <Avatar key={userId} name={assignee.name} avatarUrl={assignee.avatarUrl} size="sm" />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
