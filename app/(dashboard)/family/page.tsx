"use client";

import { useEffect, useState } from "react";
import { addDoc, arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, Star, Users } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { isDue } from "@/lib/task-scheduler";
import { categoryInfo, TASK_CATEGORIES } from "@/lib/categories";
import { dateKeyInFamilyZone, dayOfWeekInFamilyZone } from "@/lib/date-utils";
import Avatar from "@/components/Avatar";
import Leaderboard from "@/components/Leaderboard";
import type { DailyTask, Member, Recurrence, TaskCategory, TaskProposal, TaskRequest, TaskTemplate, XpLedgerEntry } from "@/lib/types";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
// JS Date.getDay() convention (0=Sun..6=Sat) — matches TaskTemplate.daysOfWeek.
const DISPLAY_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function emptyProposalForm() {
  return {
    title: "",
    category: "household" as TaskCategory,
    xpValue: 10,
    recurrence: "daily" as Recurrence,
    daysOfWeek: [] as number[],
  };
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function todayDisplayIndex(): number {
  return DISPLAY_TO_JS_DAY.indexOf(dayOfWeekInFamilyZone(new Date()));
}

export default function FamilyPage() {
  const { user } = useAuth();
  const { familyId, family } = useFamily();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(todayDisplayIndex);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState(emptyProposalForm);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [dailyTasksForDay, setDailyTasksForDay] = useState<DailyTask[]>([]);
  const [openRequests, setOpenRequests] = useState<TaskRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<XpLedgerEntry[]>([]);
  const [requestProposalDrafts, setRequestProposalDrafts] = useState<Record<string, { title: string; xpValue: string }>>({});
  const [submittingRequestProposal, setSubmittingRequestProposal] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "taskTemplates"), (snapshot) => {
      setTemplates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskTemplate));
    });
  }, [familyId]);

  // Only used to break leaderboard ties (see Leaderboard) — full history,
  // not scoped to a reason/window like AntiGamingPanel's, since a tie can
  // in principle need to look as far back as a member's very first entry.
  useEffect(() => {
    if (!familyId) return;
    const ledgerQuery = query(collection(getDb(), "families", familyId, "xpLedger"), orderBy("timestamp", "asc"));
    return onSnapshot(ledgerQuery, (snapshot) => {
      setLedgerEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpLedgerEntry));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const proposalsQuery = query(
      collection(getDb(), "families", familyId, "taskProposals"),
      where("status", "==", "pending")
    );
    return onSnapshot(proposalsQuery, (snapshot) => {
      setProposals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskProposal));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const requestsQuery = query(
      collection(getDb(), "families", familyId, "taskRequests"),
      where("status", "==", "open")
    );
    return onSnapshot(requestsQuery, (snapshot) => {
      setOpenRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskRequest));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const monday = startOfWeek(new Date());
    const selected = new Date(monday);
    selected.setDate(selected.getDate() + selectedIndex);
    const dailyTasksQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("date", "==", dateKeyInFamilyZone(selected))
    );
    return onSnapshot(dailyTasksQuery, (snapshot) => {
      setDailyTasksForDay(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
    });
  }, [familyId, selectedIndex]);

  function toggleProposalDay(day: number) {
    setProposalForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  }

  async function handleSubmitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user) return;
    setSubmittingProposal(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "taskProposals"), {
        title: proposalForm.title,
        category: proposalForm.category,
        xpValue: proposalForm.xpValue,
        recurrence: proposalForm.recurrence,
        daysOfWeek: proposalForm.recurrence === "weekly" ? proposalForm.daysOfWeek : [],
        assignedTo: [user.uid],
        proposedBy: user.uid,
        approvals: [],
        status: "pending",
        timestamp: Date.now(),
      });
      toast.success("Návrh odeslán, čeká na schválení zbytkem rodiny.");
      setProposalForm(emptyProposalForm());
      setShowProposalForm(false);
    } catch {
      toast.error("Návrh se nepodařilo odeslat.");
    } finally {
      setSubmittingProposal(false);
    }
  }

  async function handleSubmitRequestProposal(request: TaskRequest) {
    if (!familyId || !user) return;
    const draft = requestProposalDrafts[request.id];
    const xpValue = Number(draft?.xpValue);
    if (!draft?.title.trim() || !Number.isFinite(xpValue) || xpValue <= 0) return;

    setSubmittingRequestProposal(request.id);
    try {
      await addDoc(collection(getDb(), "families", familyId, "taskProposals"), {
        title: draft.title.trim(),
        category: "household",
        xpValue,
        recurrence: "daily",
        daysOfWeek: [],
        assignedTo: [request.requestedBy],
        proposedBy: user.uid,
        approvals: [],
        status: "pending",
        timestamp: Date.now(),
        requestId: request.id,
      });
      toast.success("Návrh odeslán, čeká na schválení zbytkem rodiny.");
      setRequestProposalDrafts((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
    } catch {
      toast.error("Návrh se nepodařilo odeslat.");
    } finally {
      setSubmittingRequestProposal(null);
    }
  }

  async function handleApproveProposal(proposal: TaskProposal) {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskProposals", proposal.id), {
        approvals: arrayUnion(user.uid),
      });
    } catch {
      toast.error("Nepodařilo se uložit schválení.");
    }
  }

  async function handleRejectProposal(proposal: TaskProposal) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskProposals", proposal.id), {
        status: "rejected",
      });
      toast.success("Návrh zamítnut.");
    } catch {
      toast.error("Nepodařilo se zamítnout návrh.");
    }
  }

  const monday = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const selectedDate = weekDates[selectedIndex];
  const isToday = selectedIndex === todayDisplayIndex();

  const dueTemplates = templates.filter((t) => t.active && isDue(t, selectedDate));
  const byMember = members
    .map((m) => ({ member: m, tasks: dueTemplates.filter((t) => t.assignedTo.includes(m.id)) }))
    .filter((entry) => entry.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <Leaderboard
        members={members}
        levelTitles={family?.levelTitles}
        levelThresholds={family?.levelThresholds}
        ledgerEntries={ledgerEntries}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Úkoly celé rodiny</h1>
          <p className="text-sm text-zinc-500">
            {isToday ? "Dnes" : `${DAY_LABELS[selectedIndex]} ${selectedDate.getDate()}.`}
          </p>
        </div>
        {!showProposalForm && (
          <button
            type="button"
            onClick={() => setShowProposalForm(true)}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            + Navrhnout úkol
          </button>
        )}
      </div>

      {showProposalForm && (
        <form onSubmit={handleSubmitProposal} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            placeholder="Název úkolu"
            value={proposalForm.title}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />

          <div className="flex flex-wrap gap-2">
            {TASK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setProposalForm((prev) => ({ ...prev, category: cat.value }))}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                  proposalForm.category === cat.value ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500" htmlFor="proposalXp">
              XP za splnění
            </label>
            <input
              id="proposalXp"
              type="number"
              min={1}
              value={proposalForm.xpValue}
              onChange={(e) => setProposalForm((prev) => ({ ...prev, xpValue: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-4 py-2"
            />
          </div>

          <select
            value={proposalForm.recurrence}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, recurrence: e.target.value as Recurrence }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          >
            <option value="daily">Denně</option>
            <option value="weekly">Týdně (vybrané dny)</option>
          </select>

          {proposalForm.recurrence === "weekly" && (
            <div className="flex gap-2">
              {WEEKDAYS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleProposalDay(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    proposalForm.daysOfWeek.includes(day)
                      ? "bg-accent text-accent-foreground"
                      : "border border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Návrh se stane skutečným úkolem, jakmile ho schválí zbytek rodiny.
          </p>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submittingProposal}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Odeslat návrh
            </button>
            <button
              type="button"
              onClick={() => setShowProposalForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {openRequests.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Star size={16} className="text-accent" /> Žádosti o nový úkol
          </h2>
          {openRequests.map((request) => {
            const requester = members.find((m) => m.id === request.requestedBy);
            if (request.requestedBy === user?.uid) {
              return (
                <div key={request.id} className="rounded-xl border border-border px-4 py-3 text-sm text-zinc-500">
                  Čekáš na návrh úkolu od rodiny.
                </div>
              );
            }
            const draft = requestProposalDrafts[request.id] ?? { title: "", xpValue: "10" };
            return (
              <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  {requester && <Avatar name={requester.name} avatarUrl={requester.avatarUrl} size="sm" />}
                  <p className="font-medium">{requester?.name ?? request.requestedBy} chce nový úkol</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Návrh úkolu"
                    value={draft.title}
                    onChange={(e) =>
                      setRequestProposalDrafts((prev) => ({ ...prev, [request.id]: { ...draft, title: e.target.value } }))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={draft.xpValue}
                    onChange={(e) =>
                      setRequestProposalDrafts((prev) => ({ ...prev, [request.id]: { ...draft, xpValue: e.target.value } }))
                    }
                    className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleSubmitRequestProposal(request)}
                    disabled={submittingRequestProposal === request.id || !draft.title.trim()}
                    className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    Navrhnout
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {proposals.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Návrhy úkolů</h2>
          {proposals.map((proposal) => {
            const proposer = members.find((m) => m.id === proposal.proposedBy);
            const target = proposal.requestId ? members.find((m) => m.id === proposal.assignedTo[0]) : null;
            const needed = Math.max(members.length - 1, 0);
            const isOwn = proposal.proposedBy === user?.uid;
            const alreadyVoted = user ? proposal.approvals.includes(user.uid) : false;
            return (
              <div key={proposal.id} className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {categoryInfo(proposal.category).icon} {proposal.title} · +{proposal.xpValue} XP
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      Navrhl(a) {proposer?.name ?? proposal.proposedBy}
                      {target && ` pro ${target.name}`} · schváleno {proposal.approvals.length}/{needed}
                    </p>
                  </div>
                  {!isOwn && !alreadyVoted && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveProposal(proposal)}
                        className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                      >
                        Schválit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectProposal(proposal)}
                        className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                      >
                        Zamítnout
                      </button>
                    </div>
                  )}
                  {(isOwn || alreadyVoted) && (
                    <span className="shrink-0 text-sm text-zinc-400">Čeká na ostatní</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
        {weekDates.map((date, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-zinc-500"
              }`}
            >
              {DAY_LABELS[i]}
              <span className="text-[10px] font-normal">{date.getDate()}.</span>
            </button>
          );
        })}
      </div>

      {byMember.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <Users size={40} />
          <p className="text-lg">Žádné úkoly na tento den.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {byMember.map(({ member, tasks }) => (
            <section key={member.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                <h2 className="font-medium">{member.name}</h2>
              </div>
              <div className="flex flex-col gap-2">
                {tasks.map((template) => {
                  const isDone = dailyTasksForDay.some(
                    (t) => t.templateId === template.id && t.assignedTo === member.id && t.status === "done"
                  );
                  return (
                    <div
                      key={template.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        isDone ? "border-success/30 bg-success/10" : "border-border bg-surface"
                      }`}
                    >
                      {isDone && <CheckCircle2 size={18} className="shrink-0 text-success" />}
                      <p
                        className={`min-w-0 flex-1 truncate font-medium ${
                          isDone ? "text-zinc-400 line-through" : ""
                        }`}
                      >
                        {template.category && `${categoryInfo(template.category).icon} `}
                        {template.title}
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-accent">+{template.xpValue} XP</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
