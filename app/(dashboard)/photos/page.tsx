"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { ImageOff, Undo2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { logAction } from "@/lib/audit-log";
import { dateKeyInFamilyZone, formatDateTimeInFamilyZone } from "@/lib/date-utils";
import { categoryInfo } from "@/lib/categories";
import Avatar from "@/components/Avatar";
import type { DailyTask, DailyTaskStatus, Member, TaskTemplate } from "@/lib/types";

const STATUS_LABELS: Record<DailyTaskStatus, string> = {
  pending: "Nesplněno",
  submitted: "Čeká na schválení",
  done: "Schváleno",
  returned: "Vráceno",
  missed: "Propásnuto",
};

const STATUS_COLORS: Record<DailyTaskStatus, string> = {
  pending: "text-zinc-500",
  submitted: "text-accent",
  done: "text-success",
  returned: "text-danger",
  missed: "text-danger",
};

function daysAgoKey(days: number): string {
  return dateKeyInFamilyZone(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export default function PhotosPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [templates, setTemplates] = useState<Record<string, TaskTemplate>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [fromDate, setFromDate] = useState(() => daysAgoKey(30));
  const [toDate, setToDate] = useState(() => daysAgoKey(0));
  const [memberFilter, setMemberFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");

  useEffect(() => {
    if (!familyId) return;
    const tasksQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("date", ">=", fromDate),
      where("date", "<=", toDate)
    );
    return onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
    });
  }, [familyId, fromDate, toDate]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "taskTemplates"), (snapshot) => {
      const next: Record<string, TaskTemplate> = {};
      for (const d of snapshot.docs) next[d.id] = { id: d.id, ...d.data() } as TaskTemplate;
      setTemplates(next);
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  const membersById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  const photosWithTasks = useMemo(() => {
    return tasks
      .filter((t) => Boolean(t.photoUrl))
      .filter((t) => !memberFilter || t.assignedTo === memberFilter)
      .filter((t) => !templateFilter || t.templateId === templateFilter)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }, [tasks, memberFilter, templateFilter]);

  // Only offer templates that actually have photos in the current date
  // range/member selection — no point listing ones that'd just filter to
  // an empty grid.
  const templateOptions = useMemo(() => {
    const ids = new Set(
      tasks.filter((t) => Boolean(t.photoUrl)).filter((t) => !memberFilter || t.assignedTo === memberFilter).map((t) => t.templateId)
    );
    return [...ids].map((id) => templates[id]).filter((t): t is TaskTemplate => Boolean(t));
  }, [tasks, memberFilter, templates]);

  async function handleRevert(task: DailyTask) {
    if (!familyId) return;
    const template = templates[task.templateId];
    const assignee = membersById[task.assignedTo];
    const ok = await confirm({
      title: `Vrátit „${template?.title ?? "úkol"}“ mezi nesplněné?`,
      description: `${assignee?.name ?? "Člen"} o XP za tento úkol přijde.`,
      confirmLabel: "Vrátit zpět",
      danger: true,
    });
    if (!ok) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
        status: "pending",
        completedAt: null,
      });
      if (user) {
        logAction(
          familyId,
          user.uid,
          "task_completion_reverted",
          `${template?.title ?? task.templateId} — ${assignee?.name ?? task.assignedTo}`
        );
      }
      toast.success("Úkol vrácen mezi nesplněné, XP odebráno.");
    } catch {
      toast.error("Nepodařilo se vrátit úkol.");
    }
  }

  if (member?.role !== "parent") {
    return <p className="text-zinc-500">Dostupné pouze pro rodiče.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Fotky ze splněných úkolů</h1>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMemberFilter("")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              memberFilter === "" ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            Všichni
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMemberFilter(m.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                memberFilter === m.id ? "bg-accent text-accent-foreground" : "border border-border"
              }`}
            >
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              {m.name}
            </button>
          ))}
        </div>

        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm"
        >
          <option value="">Všechny úkoly</option>
          {templateOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {categoryInfo(t.category).icon} {t.title}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-500" htmlFor="fromDate">
            Od
          </label>
          <input
            id="fromDate"
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <label className="text-sm text-zinc-500" htmlFor="toDate">
            Do
          </label>
          <input
            id="toDate"
            type="date"
            value={toDate}
            min={fromDate}
            max={daysAgoKey(0)}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {photosWithTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <ImageOff size={40} />
          <p className="text-lg">Žádné fotky v tomto výběru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photosWithTasks.map((task) => {
            const template = templates[task.templateId];
            const assignee = membersById[task.assignedTo];
            return (
              <div key={task.id} className="flex flex-col gap-1.5 overflow-hidden rounded-xl border border-border bg-surface">
                <a href={task.photoUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset */}
                  <img src={task.photoUrl} alt={template?.title ?? "Foto úkolu"} className="aspect-square w-full object-cover" />
                </a>
                <div className="flex flex-col gap-0.5 px-2 pb-2">
                  <div className="flex items-center gap-1.5">
                    {assignee && <Avatar name={assignee.name} avatarUrl={assignee.avatarUrl} size="sm" />}
                    <p className="min-w-0 truncate text-sm font-medium">{template?.title ?? task.templateId}</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {assignee?.name ?? task.assignedTo} · {task.completedAt ? formatDateTimeInFamilyZone(new Date(task.completedAt)) : task.date}
                  </p>
                  <p className={`text-xs font-medium ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</p>
                  {task.status === "done" && (
                    <button
                      type="button"
                      onClick={() => handleRevert(task)}
                      className="mt-1 flex items-center gap-1 self-start rounded-full border border-danger/30 px-2 py-1 text-xs font-semibold text-danger"
                    >
                      <Undo2 size={12} /> Odebrat XP
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
