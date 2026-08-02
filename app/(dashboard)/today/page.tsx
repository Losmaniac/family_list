"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import TaskCard from "@/components/TaskCard";
import type { DailyTask, TaskTemplate } from "@/lib/types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const { user } = useAuth();
  const { familyId } = useFamily();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [templates, setTemplates] = useState<Record<string, TaskTemplate>>({});
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
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "taskTemplates"), (snapshot) => {
      const next: Record<string, TaskTemplate> = {};
      for (const templateDoc of snapshot.docs) {
        next[templateDoc.id] = { id: templateDoc.id, ...templateDoc.data() } as TaskTemplate;
      }
      setTemplates(next);
    });
  }, [familyId]);

  async function toggleTask(task: DailyTask) {
    if (!familyId) return;
    const nextStatus = task.status === "done" ? "pending" : "done";
    await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
      status: nextStatus,
      completedAt: nextStatus === "done" ? Date.now() : null,
    });
  }

  if (loading) {
    return <p className="text-zinc-500">Načítání…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Dnešní úkoly</h1>
      {tasks.length === 0 ? (
        <p className="text-zinc-500">Na dnes nemáš žádné úkoly.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const template = templates[task.templateId];
            if (!template) return null;
            return (
              <TaskCard key={task.id} task={task} template={template} onToggle={toggleTask} />
            );
          })}
        </div>
      )}
    </div>
  );
}
