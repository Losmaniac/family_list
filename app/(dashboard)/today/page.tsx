"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { PartyPopper, Sparkles, Star, X } from "lucide-react";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { dateKeyInFamilyZone } from "@/lib/date-utils";
import { logAction } from "@/lib/audit-log";
import { compressImage } from "@/lib/image-compress";
import { formatXp } from "@/lib/xp-engine";
import TaskCard from "@/components/TaskCard";
import Avatar from "@/components/Avatar";
import AdHocTasksButton from "@/components/AdHocTasksButton";
import MyPenaltyTasks from "@/components/MyPenaltyTasks";
import PendingXpAdjustments from "@/components/PendingXpAdjustments";
import PendingJournalDeletions from "@/components/PendingJournalDeletions";
import TodayDateBanner from "@/components/TodayDateBanner";
import Link from "next/link";
import type { DailyTask, Member, TaskRequest, TaskTemplate } from "@/lib/types";

function todayKey(): string {
  return dateKeyInFamilyZone(new Date());
}

export default function TodayPage() {
  const { user } = useAuth();
  const { familyId, member, family } = useFamily();
  const toast = useToast();
  const { promptText, confirm } = useDialog();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [pendingApproval, setPendingApproval] = useState<DailyTask[]>([]);
  const [templates, setTemplates] = useState<Record<string, TaskTemplate>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [loading, setLoading] = useState(true);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [photoTask, setPhotoTask] = useState<DailyTask | null>(null);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [myRequest, setMyRequest] = useState<TaskRequest | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

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

  useEffect(() => {
    if (!familyId || !user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "taskRequests", user.uid), (snap) => {
      setMyRequest(snap.exists() ? ({ id: snap.id, ...snap.data() } as TaskRequest) : null);
    });
  }, [familyId, user]);

  // A parent completing their own task self-approves immediately. A child's
  // own task always goes through 'submitted' — only a parent action ever
  // reaches 'done', which is what actually awards XP (see onTaskCompleted).
  // A photo-required template needs the photo on the way *toward*
  // completion regardless of role — pulling a submission back (child) or
  // un-toggling a self-approved task (parent) never needs one.
  async function handleOwnToggle(task: DailyTask) {
    if (!familyId || pendingTaskIds.has(task.id)) return;
    const ref = doc(getDb(), "families", familyId, "dailyTasks", task.id);
    const template = templates[task.templateId];

    const movingTowardCompletion = member?.role === "parent" ? task.status !== "done" : task.status !== "submitted";
    if (template?.photoRequired && movingTowardCompletion) {
      setPhotoTask(task);
      photoInputRef.current?.click();
      return;
    }

    setPendingTaskIds((prev) => new Set(prev).add(task.id));
    try {
      if (member?.role === "parent") {
        const nextStatus = task.status === "done" ? "pending" : "done";
        if (nextStatus === "pending") {
          const ok = await confirm({
            title: `Vrátit „${template?.title ?? "úkol"}“ mezi nesplněné?`,
            description: "XP za tento úkol se odečte.",
            confirmLabel: "Vrátit zpět",
            danger: true,
          });
          if (!ok) return;
        }
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
      const compressed = await compressImage(file, {
        quality: family?.photoCompressionQuality,
        maxDimension: family?.photoMaxDimension,
      });
      const photoRef = storageRef(getFirebaseStorage(), `families/${familyId}/taskPhotos/${task.id}`);
      await uploadBytes(photoRef, compressed, { contentType: compressed.type || file.type });
      const photoUrl = await getDownloadURL(photoRef);
      const isParentTask = member?.role === "parent";
      await updateDoc(doc(getDb(), "families", familyId, "dailyTasks", task.id), {
        status: isParentTask ? "done" : "submitted",
        completedAt: Date.now(),
        photoUrl,
      });
      toast.success(isParentTask ? "Foto nahráno, úkol splněn." : "Foto nahráno, úkol odeslán ke schválení.");
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
      if (user) {
        const template = templates[task.templateId];
        const requester = members[task.assignedTo];
        logAction(familyId, user.uid, "task_approved", `${template?.title ?? task.templateId} — ${requester?.name ?? task.assignedTo}`);
      }
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
      if (user) {
        const template = templates[task.templateId];
        const requester = members[task.assignedTo];
        logAction(familyId, user.uid, "task_returned", `${template?.title ?? task.templateId} — ${requester?.name ?? task.assignedTo}`);
      }
      toast.success("Úkol vrácen.");
    } catch {
      toast.error("Úkol se nepodařilo vrátit.");
    }
  }

  async function handleRequestTask() {
    if (!familyId || !user) return;
    setSubmittingRequest(true);
    try {
      await setDoc(doc(getDb(), "families", familyId, "taskRequests", user.uid), {
        requestedBy: user.uid,
        status: "open",
        timestamp: Date.now(),
        date: todayKey(),
      });
      toast.success("Žádost odeslána rodině — mohou ti navrhnout nový úkol.");
    } catch {
      toast.error("Žádost se nepodařilo odeslat.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleCancelRequest() {
    if (!familyId || !myRequest) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskRequests", myRequest.id), { status: "cancelled" });
    } catch {
      toast.error("Žádost se nepodařilo zrušit.");
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
  // A child's own tasks sit at 'submitted' awaiting parent approval — that's
  // not something *they* can act on, so the "want another task" prompt goes
  // by what's still on the member's own plate (pending/returned), not by
  // whether a parent has gotten around to approving everything yet. Applies
  // equally to a parent with nothing assigned today at all (tasks.length
  // === 0) — "nothing left to do" either way, not just "finished it all".
  const remainingCount = tasks.filter((t) => t.status === "pending" || t.status === "returned").length;
  const awaitingMyAction = remainingCount > 0;
  const requestsEnabled = family?.taskRequestsEnabled !== false;
  // A parent can require the leftover count to drop to (or below) a chosen
  // number before the inline "want another task" button unlocks — absent =
  // no limit, so it's available as soon as anything is left, same as
  // before this setting existed.
  const maxRemainingForInlineRequest = family?.taskRequestMaxRemaining ?? Infinity;
  // A request is only ever a same-day ask — one left open from a previous
  // day (the cron sweep cancels those, but only runs once at 00:05) should
  // never keep blocking a fresh "want another task" click today.
  const hasOpenRequestToday = myRequest?.status === "open" && myRequest.date === todayKey();

  const requestCta = requestsEnabled && !awaitingMyAction && (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-center">
      {hasOpenRequestToday ? (
        <>
          <p className="text-sm text-zinc-500">Čekáš na návrh nového úkolu od rodiny.</p>
          <button type="button" onClick={handleCancelRequest} className="flex items-center gap-1 text-sm text-zinc-500">
            <X size={14} /> Zrušit žádost
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">Nemáš žádné nesplněné úkoly. Chceš další?</p>
          <button
            type="button"
            onClick={handleRequestTask}
            disabled={submittingRequest}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            <Star size={14} /> Chci nový úkol
          </button>
        </>
      )}
    </div>
  );

  // A leftover task or two (e.g. something meant for later, like an evening
  // chore) shouldn't block asking for extra in the meantime — this is the
  // same request flow as requestCta above, just a low-key inline version
  // that stays available alongside a still-nonempty task list instead of
  // only appearing once every last pending/returned task is gone.
  const requestMoreInline = requestsEnabled && awaitingMyAction && remainingCount <= maxRemainingForInlineRequest && (
    <div className="flex flex-col items-center gap-1 pt-1 text-center">
      {hasOpenRequestToday ? (
        <button type="button" onClick={handleCancelRequest} className="flex items-center gap-1 text-sm text-zinc-500">
          <X size={14} /> Čekáš na návrh nového úkolu — zrušit žádost
        </button>
      ) : (
        <button
          type="button"
          onClick={handleRequestTask}
          disabled={submittingRequest}
          className="flex items-center gap-1.5 text-sm font-semibold text-accent disabled:opacity-50"
        >
          <Star size={14} /> Chci ještě další úkol
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-6">
      <TodayDateBanner />

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      {familyId && <MyPenaltyTasks familyId={familyId} />}

      {familyId && member?.role === "parent" && <PendingXpAdjustments familyId={familyId} />}

      {familyId && member?.role === "parent" && <PendingJournalDeletions familyId={familyId} />}

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
                    <button
                      type="button"
                      onClick={() => setExpandedPhotoUrl(task.photoUrl!)}
                      className="shrink-0"
                      aria-label="Zvětšit foto"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset */}
                      <img
                        src={task.photoUrl}
                        alt="Foto potvrzení úkolu"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    </button>
                  )}
                  {requester && <Avatar name={requester.name} avatarUrl={requester.avatarUrl} size="sm" />}
                  <div>
                    <p className="font-medium">{template.title}</p>
                    <p className="text-sm text-zinc-500">
                      {requester?.name ?? task.assignedTo} · +{formatXp(template.xpValue)} XP
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
        <div className="flex items-center gap-3">
          {familyId && <AdHocTasksButton familyId={familyId} />}
          <h1 className="text-xl font-semibold">Dnešní úkoly</h1>
        </div>
        {tasks.length === 0 && Object.keys(templates).length === 0 ? (
          member?.role === "parent" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-500">
              <Sparkles size={40} />
              <p className="text-lg text-foreground">Vítej! Rodina ještě nemá žádné úkoly.</p>
              <p className="max-w-xs text-sm">
                Založ první úkoly na kartě Zadat — vyber si z připravených šablon nebo si vytvoř vlastní.
              </p>
              <Link
                href="/assign"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Nastavit první úkoly
              </Link>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-zinc-500">
              <PartyPopper size={40} />
              <p className="text-lg">Rodiče ještě nenastavili žádné úkoly.</p>
            </div>
          )
        ) : tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-zinc-500">
            <PartyPopper size={40} />
            <p className="text-lg">Na dnes nemáš žádné úkoly.</p>
            {requestCta}
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

            {requestCta}
            {requestMoreInline}
          </div>
        )}
      </section>

      {expandedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpandedPhotoUrl(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedPhotoUrl(null)}
            aria-label="Zavřít"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset */}
          <img
            src={expandedPhotoUrl}
            alt="Foto potvrzení úkolu"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
