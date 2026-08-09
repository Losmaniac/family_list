"use client";

import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatXp } from "@/lib/xp-engine";
import { computePendingPenalty, formatTimeUntil, penaltyDeadlineAt, totalPenaltyAppliedXp } from "@/lib/penalty-tasks";
import Avatar from "@/components/Avatar";
import type { Member, PenaltyTask } from "@/lib/types";

function emptyForm() {
  return {
    title: "",
    assignedTo: [] as string[],
    deadlineHours: 24,
    penaltyXp: 20,
    recurringXp: 10,
    recurringIntervalHours: 6,
  };
}

/**
 * Parent-only "do this or lose XP" deadline for something repeatedly
 * ignored. Uploading a photo / marking done is only ever a "please check
 * this" flag from the assigned member (MyPenaltyTasks) — only a parent
 * resolving it here actually stops the XP deduction (penaltyTaskSweep
 * Cloud Function applies it server-side).
 */
export default function PenaltyTaskPanel({ familyId, members }: { familyId: string; members: Member[] }) {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();
  const [tasks, setTasks] = useState<PenaltyTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "penaltyTasks"), (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PenaltyTask));
    });
  }, [familyId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  function toggleAssignee(memberId: string) {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(memberId)
        ? prev.assignedTo.filter((id) => id !== memberId)
        : [...prev.assignedTo, memberId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.title.trim() || form.assignedTo.length === 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "penaltyTasks"), {
        title: form.title.trim(),
        assignedTo: form.assignedTo,
        createdBy: user.uid,
        createdAt: Date.now(),
        deadlineHours: form.deadlineHours,
        penaltyXp: form.penaltyXp,
        recurringXp: form.recurringXp,
        recurringIntervalHours: form.recurringIntervalHours,
        status: "pending",
        penaltiesApplied: 0,
      });
      toast.success("Postihový úkol byl zadán.");
      setForm(emptyForm());
      setShowForm(false);
    } catch {
      toast.error("Úkol se nepodařilo zadat.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleResolve = useCallback(
    async (task: PenaltyTask) => {
      if (!user) return;
      const ok = await confirm({
        title: `Potvrdit splnění „${task.title}“?`,
        description: "Tím se zastaví další odečítání XP za tento úkol.",
        confirmLabel: "Potvrdit",
      });
      if (!ok) return;
      try {
        await updateDoc(doc(getDb(), "families", familyId, "penaltyTasks", task.id), {
          status: "resolved",
          resolvedAt: Date.now(),
          resolvedBy: user.uid,
        });
        toast.success("Úkol potvrzen, odečítání XP zastaveno.");
      } catch {
        toast.error("Nepodařilo se potvrdit splnění.");
      }
    },
    [familyId, user, confirm, toast]
  );

  async function handleDelete(task: PenaltyTask) {
    const ok = await confirm({
      title: `Smazat postihový úkol „${task.title}“?`,
      description: "Tuto akci nelze vrátit zpět. Už odečtené XP se nevrátí.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "penaltyTasks", task.id));
      toast.success("Úkol byl smazán.");
    } catch {
      toast.error("Úkol se nepodařilo smazat.");
    }
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const resolved = tasks.filter((t) => t.status === "resolved");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Pro věci, které jsi řekl(a) opakovaně a stále se neplní. Pokud úkol nebude do termínu tebou potvrzený jako
        splněný, přiřazení automaticky přijdou o XP — a dál každou další nastavenou dobu, dokud to nepotvrdíš.
        Nahrání fotky nebo označení „hotovo“ samo o sobě odečítání nezastaví.
      </p>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          {pending.map((task) => {
            const deadline = penaltyDeadlineAt(task);
            const due = computePendingPenalty(task, now);
            const lost = totalPenaltyAppliedXp(task) + due.xpToDeduct;
            return (
              <div key={task.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{task.title}</p>
                  {lost > 0 && <p className="text-sm font-semibold text-danger">-{formatXp(lost)} XP</p>}
                </div>
                <p className="text-sm text-zinc-500">{formatTimeUntil(deadline - now)}</p>
                {task.submittedAt && (
                  <p className="text-sm text-accent">Označeno jako hotovo — čeká na potvrzení.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {task.assignedTo.map((id) => {
                    const m = members.find((mm) => mm.id === id);
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs"
                      >
                        {m && <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />}
                        {m?.name ?? id}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleResolve(task)}
                    className="text-sm font-semibold text-success"
                  >
                    Potvrdit splnění
                  </button>
                  <button type="button" onClick={() => handleDelete(task)} className="text-sm text-danger">
                    Smazat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="text-sm text-zinc-500">
          <summary className="cursor-pointer">Vyřešené ({resolved.length})</summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {resolved.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{task.title}</span>
                <span className="text-zinc-400">-{formatXp(totalPenaltyAppliedXp(task))} XP celkem</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          + Zadat postihový úkol
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Např. Uklidit pokoj"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                  form.assignedTo.includes(m.id) ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="w-48 text-sm text-zinc-500">Termín (hodin od zadání)</label>
            <input
              type="number"
              min={1}
              value={form.deadlineHours}
              onChange={(e) => setForm((prev) => ({ ...prev, deadlineHours: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-48 text-sm text-zinc-500">XP při zmeškání termínu</label>
            <input
              type="number"
              min={1}
              value={form.penaltyXp}
              onChange={(e) => setForm((prev) => ({ ...prev, penaltyXp: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-48 text-sm text-zinc-500">Další XP každých</label>
            <input
              type="number"
              min={0}
              value={form.recurringIntervalHours}
              onChange={(e) => setForm((prev) => ({ ...prev, recurringIntervalHours: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2"
            />
            <span className="text-sm text-zinc-500">hodin</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-48 text-sm text-zinc-500">XP za každý další interval</label>
            <input
              type="number"
              min={0}
              value={form.recurringXp}
              onChange={(e) => setForm((prev) => ({ ...prev, recurringXp: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.title.trim() || form.assignedTo.length === 0}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Zadat úkol
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
