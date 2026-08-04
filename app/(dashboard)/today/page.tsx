"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { PartyPopper } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import TaskCard from "@/components/TaskCard";
import Avatar from "@/components/Avatar";
import PersonalWeekAhead from "@/components/PersonalWeekAhead";
import type { DailyTask, Member, TaskTemplate } from "@/lib/types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [pendingApproval, setPendingApproval] = useState<DailyTask[]>([]);
  const [templates, setTemplates] = useState<Record<string, TaskTemplate>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !user) return;
    const tasksQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("assignedTo", "==", user.uid),
      where("date", "==", todayKey())
    );
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
      setLoading(false);
    });
    return unsubscribe;
  }, [familyId, user]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    const approvalQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("status", "==", "submitted")
    );
    return onSnapshot(approvalQuery, (snapshot) => {
      setPendingApproval(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
    });
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "taskTemplates"), (snapshot) => {
      const next: Record<string, TaskTemplate> = {};
      for (const templateDoc of snapshot.docs) {
        next[templateDoc.id] = { id: templateDoc.id, ...templateDoc.data() } as TaskTemplate;
      }
      setTemplates(next);
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId, member?.role]);

  // A parent completing their own task self-approves immediately. A child's
  // own task always goes through 'submitted' — only a parent action ever
  // reaches 'done', which is what actually awards XP (see onTaskCompleted).
  async function handleOwnToggle(task: DailyTask) {
    if (!familyId) return;
    const ref = doc(getDb(), "families", familyId, "dailyTasks", task.id);

    if (member?.role === "parent") {
      const nextStatus = task.status === "done" ? "pending" : "done";
      await updateDoc(ref, { status: nextStatus, completedAt: nextStatus === "done" ? Date.now() : null });
      return;
    }

    if (task.status === "pending") {
      await updateDoc(ref, { status: "submitted", completedAt: Date.now() });
    } else if (task.status === "submitted") {
      await updateDoc(ref, { status: "pending", completedAt: null });
    } else if (task.status === "returned") {
      await updateDoc(ref, { status: "submitted", completedAt: Date.now() });
    }
  }

  async function handleApprove(task: DailyTask) {
    if (!familyId) return;
    await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), { status: "done" });
  }

  async function handleReturn(task: DailyTask) {
    if (!familyId) return;
    const comment = prompt("Proč úkol vracíš? (nepovinné)") ?? "";
    await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
      status: "returned",
      returnComment: comment,
    });
  }

  if (loading) {
    return <p className="text-zinc-500">Načítání…</p>;
  }

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex flex-col gap-6">
      {pendingApproval.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Čeká na schválení</h2>
          {pendingApproval.map((task) => {
            const template = templates[task.templateId];
            const requester = members[task.assignedTo];
            if (!template) return null;
            return (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {requester && <Avatar name={requester.name} avatarUrl={requester.avatarUrl} size="sm" />}
                  <div>
                    <p className="font-medium">{template.title}</p>
                    <p className="text-sm text-zinc-500">
                      {requester?.name ?? task.assignedTo} · +{template.xpValue} XP
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(task)}
                    className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                  >
                    Schválit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReturn(task)}
                    className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                  >
                    Vrátit
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Dnešní úkoly</h1>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-zinc-500">
            <PartyPopper size={32} />
            <p>Na dnes nemáš žádné úkoly.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {active.length > 0 && (
              <div className="flex flex-col gap-2">
                {active.map((task) => {
                  const template = templates[task.templateId];
                  if (!template) return null;
                  return <TaskCard key={task.id} task={task} template={template} onToggle={handleOwnToggle} />;
                })}
              </div>
            )}
            {done.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-zinc-500">Hotovo</p>
                {done.map((task) => {
                  const template = templates[task.templateId];
                  if (!template) return null;
                  return <TaskCard key={task.id} task={task} template={template} onToggle={handleOwnToggle} />;
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {user && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Tento týden</h2>
          <PersonalWeekAhead templates={Object.values(templates)} userId={user.uid} />
        </section>
      )}
    </div>
  );
}
