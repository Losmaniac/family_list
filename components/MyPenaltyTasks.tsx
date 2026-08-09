"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import { computePendingPenalty, formatTimeUntil, penaltyDeadlineAt, totalPenaltyAppliedXp } from "@/lib/penalty-tasks";
import type { PenaltyTask } from "@/lib/types";

/**
 * Shows the signed-in member their own pending "postihové úkoly" — a
 * live countdown to (or overdue duration past) the deadline, and how much
 * XP has already been lost. "Označit jako hotovo" only flags it for a
 * parent to check; it never stops the deduction by itself (see
 * PenaltyTaskPanel, which is the only place that can actually resolve one).
 */
export default function MyPenaltyTasks({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<PenaltyTask[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    const tasksQuery = query(
      collection(getDb(), "families", familyId, "penaltyTasks"),
      where("status", "==", "pending"),
      where("assignedTo", "array-contains", user.uid)
    );
    return onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PenaltyTask));
    });
  }, [familyId, user]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(
    async (task: PenaltyTask) => {
      try {
        await updateDoc(doc(getDb(), "families", familyId, "penaltyTasks", task.id), { submittedAt: Date.now() });
        toast.success("Rodiči přišlo, že je hotovo — musí to ale potvrdit, aby se zastavilo odečítání XP.");
      } catch {
        toast.error("Nepodařilo se odeslat.");
      }
    },
    [familyId, toast]
  );

  if (tasks.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-danger">
        <AlertTriangle size={16} /> Nesplněné úkoly s postihem
      </h2>
      {tasks.map((task) => {
        const deadline = penaltyDeadlineAt(task);
        const due = computePendingPenalty(task, now);
        const lost = totalPenaltyAppliedXp(task) + due.xpToDeduct;
        return (
          <div key={task.id} className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{task.title}</p>
              {lost > 0 && <p className="text-sm font-semibold text-danger">-{formatXp(lost)} XP</p>}
            </div>
            <p className="text-sm text-zinc-500">{formatTimeUntil(deadline - now)}</p>
            {task.submittedAt ? (
              <p className="text-sm text-accent">Odesláno — čeká na potvrzení rodičem.</p>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(task)}
                className="self-start rounded-full border border-border px-4 py-1.5 text-sm font-semibold"
              >
                Označit jako hotovo
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
