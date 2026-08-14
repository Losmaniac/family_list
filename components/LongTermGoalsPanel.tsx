"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Target, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import type { LongTermGoal, Member } from "@/lib/types";

function emptyForm(defaultAssignee: string) {
  return { title: "", description: "", assignedTo: defaultAssignee, targetXp: "", deadline: "" };
}

/**
 * "Dlouhodobé cíle" — an aspiration spanning days/weeks/months (e.g. "dostat
 * se na gymnázium"), deliberately outside the daily task engine: it's never
 * "missed" and never affects a day's completion or streaks (see LongTermGoal
 * in lib/types.ts). `variant="manage"` (parents, on the Zadávání page) shows
 * every member's goals with a create form and achieve/abandon/delete
 * controls; `variant="mine"` (everyone, on the Today page) shows only the
 * signed-in member's own active goals, read-only, with a progress bar when
 * targetXp is set.
 */
export default function LongTermGoalsPanel({ variant }: { variant: "manage" | "mine" }) {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user?.uid ?? ""));
  const [submitting, setSubmitting] = useState(false);

  const isParent = member?.role === "parent";

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "longTermGoals"), (snapshot) => {
      setGoals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as LongTermGoal));
    });
  }, [familyId]);

  if (variant === "manage" && !isParent) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !form.title.trim() || !form.assignedTo) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "longTermGoals"), {
        title: form.title.trim(),
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        assignedTo: form.assignedTo,
        createdBy: user.uid,
        createdAt: Date.now(),
        ...(form.targetXp && Number(form.targetXp) > 0 ? { targetXp: Number(form.targetXp) } : {}),
        ...(form.deadline ? { deadline: form.deadline } : {}),
        status: "active",
      });
      toast.success("Cíl přidán.");
      setForm(emptyForm(form.assignedTo));
      setShowForm(false);
    } catch {
      toast.error("Cíl se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(goal: LongTermGoal, status: LongTermGoal["status"]) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "longTermGoals", goal.id), {
        status,
        ...(status === "achieved" ? { achievedAt: Date.now() } : {}),
      });
    } catch {
      toast.error("Nepodařilo se uložit změnu.");
    }
  }

  async function handleDelete(goal: LongTermGoal) {
    if (!familyId) return;
    const ok = await confirm({
      title: "Smazat cíl?",
      description: `„${goal.title}“ bude odstraněn.`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "longTermGoals", goal.id));
    } catch {
      toast.error("Cíl se nepodařilo smazat.");
    }
  }

  function memberXp(memberId: string): number {
    return members.find((m) => m.id === memberId)?.xpBalance ?? 0;
  }

  function GoalCard({ goal, showMember }: { goal: LongTermGoal; showMember: boolean }) {
    const goalMember = members.find((m) => m.id === goal.assignedTo);
    const currentXp = memberXp(goal.assignedTo);
    const progressPct = goal.targetXp ? Math.min(100, Math.round((currentXp / goal.targetXp) * 100)) : null;
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{goal.title}</p>
              {goal.description && <p className="text-sm text-zinc-500">{goal.description}</p>}
              {showMember && goalMember && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Avatar name={goalMember.name} avatarUrl={goalMember.avatarUrl} size="sm" />
                  {goalMember.name}
                </div>
              )}
              {goal.deadline && <p className="mt-1 text-xs text-zinc-400">Termín: {goal.deadline}</p>}
            </div>
          </div>
          {variant === "manage" && goal.status === "active" && (
            <button
              type="button"
              onClick={() => handleDelete(goal)}
              aria-label="Smazat cíl"
              className="shrink-0 text-zinc-400 hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {progressPct !== null && goal.status === "active" && (
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-zinc-500">
              {formatXp(currentXp)} / {formatXp(goal.targetXp!)} XP ({progressPct} %)
            </p>
          </div>
        )}
        {goal.status === "achieved" && <p className="text-sm font-medium text-success">🎉 Splněno!</p>}
        {goal.status === "abandoned" && <p className="text-sm text-zinc-400">Zrušeno</p>}
        {variant === "manage" && goal.status === "active" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus(goal, "achieved")}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
            >
              Označit jako splněné
            </button>
            <button
              type="button"
              onClick={() => setStatus(goal, "abandoned")}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-zinc-500"
            >
              Zrušit
            </button>
          </div>
        )}
      </div>
    );
  }

  if (variant === "mine") {
    const myGoals = goals
      .filter((g) => g.assignedTo === user?.uid)
      .sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1) || b.createdAt - a.createdAt);
    if (myGoals.length === 0) return null;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
          <Target size={16} /> Dlouhodobé cíle
        </h3>
        <div className="flex flex-col gap-2">
          {myGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} showMember={false} />
          ))}
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const pastGoals = goals.filter((g) => g.status !== "active");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dlouhodobé cíle</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            + Přidat cíl
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500">
        Přesahuje jednotlivé dny — např. „dostat se na gymnázium za určitý počet XP“. Nikdy se nepočítá jako
        nesplněný den a neovlivňuje streak ani ostatní úkoly.
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Název cíle"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <input
            type="text"
            placeholder="Popis (nepovinné)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, assignedTo: m.id }))}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                  form.assignedTo === m.id ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-xs text-zinc-500">Cílové XP (nepovinné)</p>
              <input
                type="number"
                min={1}
                placeholder="např. 5000"
                value={form.targetXp}
                onChange={(e) => setForm((prev) => ({ ...prev, targetXp: e.target.value }))}
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-xs text-zinc-500">Termín (nepovinné)</p>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.assignedTo}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
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

      {activeGoals.length === 0 && pastGoals.length === 0 ? (
        <p className="text-sm text-zinc-500">Zatím žádné dlouhodobé cíle.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} showMember />
          ))}
          {pastGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} showMember />
          ))}
        </div>
      )}
    </div>
  );
}
