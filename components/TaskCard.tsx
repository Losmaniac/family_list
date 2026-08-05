import { Camera, CheckCircle2, Circle, Clock, RotateCcw } from "lucide-react";
import { categoryInfo } from "@/lib/categories";
import type { DailyTask, TaskTemplate } from "@/lib/types";

interface TaskCardProps {
  task: DailyTask;
  template: TaskTemplate;
  onToggle?: (task: DailyTask) => void;
  disabled?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  done: "border-success/30 bg-success/10",
  submitted: "border-accent/30 bg-accent/10",
  returned: "border-danger/30 bg-danger/10",
};

export default function TaskCard({ task, template, onToggle, disabled }: TaskCardProps) {
  const categoryIcon = template.category ? categoryInfo(template.category).icon : null;

  return (
    <button
      type="button"
      onClick={() => onToggle?.(task)}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${
        STATUS_STYLES[task.status] ?? "border-border bg-surface"
      }`}
    >
      <StatusIcon status={task.status} />
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1 font-medium ${task.status === "done" ? "text-zinc-400 line-through" : ""}`}>
          {categoryIcon && <span>{categoryIcon}</span>}
          {template.title}
          {template.photoRequired && (task.status === "pending" || task.status === "returned") && (
            <Camera size={14} className="shrink-0 text-zinc-400" aria-label="Vyžaduje foto" />
          )}
        </p>
        {task.status === "returned" && task.returnComment ? (
          <p className="truncate text-sm text-danger">Vráceno: {task.returnComment}</p>
        ) : task.status === "submitted" ? (
          <p className="text-sm text-accent">Čeká na schválení</p>
        ) : (
          template.description && <p className="truncate text-sm text-zinc-500">{template.description}</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold text-accent">+{template.xpValue} XP</span>
    </button>
  );
}

function StatusIcon({ status }: { status: DailyTask["status"] }) {
  if (status === "done") return <CheckCircle2 className="shrink-0 text-success" size={22} />;
  if (status === "submitted") return <Clock className="shrink-0 text-accent" size={22} />;
  if (status === "returned") return <RotateCcw className="shrink-0 text-danger" size={22} />;
  return <Circle className="shrink-0 text-zinc-400" size={22} />;
}
