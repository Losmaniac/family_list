import { Camera, CheckCircle2, Circle, Clock, RotateCcw } from "lucide-react";
import { categoryInfo } from "@/lib/categories";
import { formatXp } from "@/lib/xp-engine";
import { useDialog } from "@/lib/dialog-context";
import type { DailyTask, TaskTemplate } from "@/lib/types";

const STATUS_EXPLANATIONS: Record<string, string> = {
  pending: "Úkol čeká na splnění.",
  submitted: "Úkol byl odeslán ke schválení rodiči — XP se připíše až po schválení.",
  done: "Úkol je hotový a XP už bylo připsáno.",
  returned: "Rodič úkol vrátil zpět — podívej se na jeho poznámku a zkus to znovu.",
};

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

/**
 * Full detail text for the tap-to-view dialog — the row itself only ever
 * shows a truncated single-line description, so this is the one place a
 * member can read the whole thing plus everything else about the task
 * (category, reward, photo requirement, current status, a parent's return
 * comment) without that also completing/uncompleting it.
 */
function buildDetails(task: DailyTask, template: TaskTemplate): string {
  const parts: string[] = [];
  if (template.description) parts.push(template.description);
  parts.push(`Kategorie: ${categoryInfo(template.category).label}.`);
  parts.push(`Odměna: +${formatXp(template.xpValue)} XP.`);
  if (template.photoRequired) parts.push("Vyžaduje přiložit foto jako důkaz.");
  if (STATUS_EXPLANATIONS[task.status]) parts.push(STATUS_EXPLANATIONS[task.status]);
  if (task.status === "returned" && task.returnComment) parts.push(`Poznámka rodiče: ${task.returnComment}`);
  return parts.join(" ");
}

export default function TaskCard({ task, template, onToggle, disabled }: TaskCardProps) {
  const { info } = useDialog();
  const categoryIcon = template.category ? categoryInfo(template.category).icon : null;

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
        STATUS_STYLES[task.status] ?? "border-border bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle?.(task)}
        disabled={disabled}
        aria-label={task.status === "pending" || task.status === "returned" ? "Splnit úkol" : "Zrušit splnění"}
        className="shrink-0 disabled:opacity-60"
      >
        <StatusIcon status={task.status} />
      </button>
      <button
        type="button"
        onClick={() => info({ title: template.title, description: buildDetails(task, template) })}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
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
        <span className="shrink-0 text-sm font-semibold text-accent">+{formatXp(template.xpValue)} XP</span>
      </button>
    </div>
  );
}

function StatusIcon({ status }: { status: DailyTask["status"] }) {
  if (status === "done") return <CheckCircle2 className="shrink-0 text-success" size={22} />;
  if (status === "submitted") return <Clock className="shrink-0 text-accent" size={22} />;
  if (status === "returned") return <RotateCcw className="shrink-0 text-danger" size={22} />;
  return <Circle className="shrink-0 text-zinc-400" size={22} />;
}
