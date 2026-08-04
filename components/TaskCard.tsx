import { CheckCircle2, Circle } from "lucide-react";
import type { DailyTask, TaskTemplate } from "@/lib/types";

interface TaskCardProps {
  task: DailyTask;
  template: TaskTemplate;
  onToggle?: (task: DailyTask) => void;
}

export default function TaskCard({ task, template, onToggle }: TaskCardProps) {
  const isDone = task.status === "done";

  return (
    <button
      type="button"
      onClick={() => onToggle?.(task)}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        isDone ? "border-success/30 bg-success/10" : "border-border bg-surface"
      }`}
    >
      {isDone ? (
        <CheckCircle2 className="shrink-0 text-success" size={22} />
      ) : (
        <Circle className="shrink-0 text-zinc-400" size={22} />
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${isDone ? "text-zinc-400 line-through" : ""}`}>{template.title}</p>
        {template.description && <p className="truncate text-sm text-zinc-500">{template.description}</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold text-accent">+{template.xpValue} XP</span>
    </button>
  );
}
