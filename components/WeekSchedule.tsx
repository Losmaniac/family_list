"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
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

// JS Date.getDay() convention (0=Sun..6=Sat) — matches TaskTemplate.daysOfWeek.
const DISPLAY_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

interface DayColumnProps {
  dayIndex: number;
  label: string;
  isToday: boolean;
  templates: TaskTemplate[];
  members: Member[];
}

function DayColumn({ dayIndex, label, isToday, templates, members }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[92px] flex-col gap-1.5 rounded-lg border p-2 transition-colors ${
        isOver ? "border-accent bg-accent/10" : isToday ? "border-accent bg-accent/5" : "border-border"
      }`}
    >
      <p className={`text-xs font-semibold ${isToday ? "text-accent" : "text-zinc-500"}`}>{label}</p>
      <div className="flex min-h-8 flex-col gap-1">
        {templates.map((template) => (
          <TaskChip key={template.id} template={template} dayIndex={dayIndex} members={members} />
        ))}
      </div>
    </div>
  );
}

interface TaskChipProps {
  template: TaskTemplate;
  dayIndex: number;
  members: Member[];
}

function TaskChip({ template, dayIndex, members }: TaskChipProps) {
  const draggable = template.recurrence === "weekly" || template.recurrence === "custom";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${template.id}::${dayIndex}`,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={`flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-1 ${
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      {draggable && <GripVertical size={12} className="shrink-0 text-zinc-400" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{template.title}</p>
        <div className="mt-0.5 flex -space-x-1">
          {template.assignedTo.map((userId) => {
            const assignee = members.find((m) => m.id === userId);
            if (!assignee) return null;
            return <Avatar key={userId} name={assignee.name} avatarUrl={assignee.avatarUrl} size="sm" />;
          })}
        </div>
      </div>
    </div>
  );
}

interface WeekScheduleProps {
  templates: TaskTemplate[];
  members: Member[];
  onReassignDay?: (template: TaskTemplate, fromDay: number, toDay: number) => void;
}

export default function WeekSchedule({ templates, members, onReassignDay }: WeekScheduleProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const monday = startOfWeek(new Date());
  const todayKey = new Date().toISOString().slice(0, 10);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const activeTemplates = templates.filter((t) => t.active);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !onReassignDay) return;

    const [templateId, fromDayStr] = String(active.id).split("::");
    const fromDay = Number(fromDayStr);
    const toDay = Number(String(over.id).replace("day-", ""));
    if (fromDay === toDay) return;

    const template = templates.find((t) => t.id === templateId);
    if (template) onReassignDay(template, fromDay, toDay);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
        {weekDates.map((date, displayIndex) => {
          const dayIndex = DISPLAY_TO_JS_DAY[displayIndex];
          const dateKey = date.toISOString().slice(0, 10);
          const dueTemplates = activeTemplates.filter((t) => isDue(t, date));

          return (
            <DayColumn
              key={dateKey}
              dayIndex={dayIndex}
              label={`${DAY_LABELS[displayIndex]} ${date.getDate()}.`}
              isToday={dateKey === todayKey}
              templates={dueTemplates}
              members={members}
            />
          );
        })}
      </div>
      {onReassignDay && (
        <p className="mt-2 text-xs text-zinc-500">
          Přetáhni úkol na jiný den pro změnu termínu (funguje jen u týdenních úkolů).
        </p>
      )}
    </DndContext>
  );
}
