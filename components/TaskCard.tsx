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
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
        isDone
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div>
        <p className={`font-medium ${isDone ? "line-through text-zinc-400" : ""}`}>
          {template.title}
        </p>
        {template.description && (
          <p className="text-sm text-zinc-500">{template.description}</p>
        )}
      </div>
      <span className="text-sm font-semibold text-amber-600">+{template.xpValue} XP</span>
    </button>
  );
}
