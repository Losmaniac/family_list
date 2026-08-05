"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { PartyPopper } from "lucide-react";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { dateKeyInFamilyZone } from "@/lib/date-utils";
import TaskCard from "@/components/TaskCard";
import Avatar from "@/components/Avatar";
import type { DailyTask, Member, TaskTemplate } from "@/lib/types";

function todayKey(): string {
  return dateKeyInFamilyZone(new Date());
}

export default function TodayPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { promptText } = useDialog();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [pendingApproval, setPendingApproval] = useState<DailyTask[]>([]);
  const [templates, setTemplates] = useState<Record<string, TaskTemplate>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [loading, setLoading] = useState(true);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [photoTask, setPhotoTask] = useState<DailyTask | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
    if (!familyId || pendingTaskIds.has(task.id)) return;
    const ref = doc(getDb(), "families", familyId, "dailyTasks", task.id);
    const template = templates[task.templateId];

    if (member?.role !== "parent" && template?.photoRequired && task.status !== "submitted") {
      setPhotoTask(task);
      photoInputRef.current?.click();
      return;
    }

    setPendingTaskIds((prev) => new Set(prev).add(task.id));
    try {
      if (member?.role === "parent") {
        const nextStatus = task.status === "done" ? "pending" : "done";
        await updateDoc(ref, { status: nextStatus, completedAt: nextStatus === "done" ? Date.now() : null });
        return;
      }

      if (task.status === "pending") {
        await updateDoc(ref, { status: "submitted", completedAt: Date.now() });
        toast.success("Úkol odeslán ke schválení.");
      } else if (task.status === "submitted") {
        await updateDoc(ref, { status: "pending", completedAt: null });
      } else if (task.status === "returned") {
        await updateDoc(ref, { status: "submitted", completedAt: Date.now() });
        toast.success("Úkol znovu odeslán ke schválení.");
      }
    } catch {
      toast.error("Úkol se nepodařilo aktualizovat.");
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const task = photoTask;
    e.target.value = "";
    setPhotoTask(null);
    if (!file || !task || !familyId) return;

    setPendingTaskIds((prev) => new Set(prev).add(task.id));
    try {
      const photoRef = storageRef(getFirebaseStorage(), `families/${familyId}/taskPhotos/${task.id}`);
      await uploadBytes(photoRef, file, { contentType: file.type });
      const photoUrl = await getDownloadURL(photoRef);
      await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
        status: "submitted",
        completedAt: Date.now(),
        photoUrl,
      });
      toast.success("Foto nahráno, úkol odeslán ke schválení.");
    } catch {
      toast.error("Foto se nepodařilo nahrát.");
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  async function handleApprove(task: DailyTask) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), { status: "done" });
      toast.success("Úkol schválen.");
    } catch {
      toast.error("Úkol se nepodařilo schválit.");
    }
  }

  async function handleReturn(task: DailyTask) {
    if (!familyId) return;
    const comment = await promptText({
      title: "Proč úkol vracíš?",
      description: "Nepovinné — dítě uvidí tento komentář.",
      placeholder: "Např. ještě to není celé hotové…",
    });
    if (comment === null) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
        status: "returned",
        returnComment: comment,
      });
      toast.success("Úkol vrácen.");
    } catch {
      toast.error("Úkol se nepodařilo vrátit.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-2" aria-label="Načítání…">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-xl bg-surface-muted" />
        ))}
      </div>
    );
  }

  const active = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        className="hidden"
      />

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
                  {task.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset
                    <img
                      src={task.photoUrl}
                      alt="Foto potvrzení úkolu"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  )}
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

      <section className="flex flex-1 flex-col gap-4">
        <h1 className="text-xl font-semibold">Dnešní úkoly</h1>
        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-zinc-500">
            <PartyPopper size={40} />
            <p className="text-lg">Na dnes nemáš žádné úkoly.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {active.length > 0 && (
              <div className="flex flex-col gap-2">
                {active.map((task) => {
                  const template = templates[task.templateId];
                  if (!template) return null;
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      template={template}
                      onToggle={handleOwnToggle}
                      disabled={pendingTaskIds.has(task.id)}
                    />
                  );
                })}
              </div>
            )}
            {done.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-zinc-500">Hotovo</p>
                {done.map((task) => {
                  const template = templates[task.templateId];
                  if (!template) return null;
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      template={template}
                      onToggle={handleOwnToggle}
                      disabled={pendingTaskIds.has(task.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
