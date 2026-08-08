"use client";

import { useEffect, useState } from "react";
import { addDoc, arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { CheckCircle2, ChevronLeft, ChevronRight, Star, Trash2, Users } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { isDue } from "@/lib/task-scheduler";
import { categoryInfo, TASK_CATEGORIES } from "@/lib/categories";
import { addMonths, dateKeyInFamilyZone, daysInMonth, isSameDay, startOfMonth } from "@/lib/date-utils";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import Leaderboard from "@/components/Leaderboard";
import type {
  DailyTask,
  Investment,
  Member,
  Recurrence,
  TaskCategory,
  TaskProposal,
  TaskRequest,
  TaskTemplate,
  XpLedgerEntry,
} from "@/lib/types";

// JS Date.getDay() convention (0=Sun..6=Sat) — matches TaskTemplate.daysOfWeek.
const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" });

function emptyProposalForm() {
  return {
    title: "",
    category: "household" as TaskCategory,
    xpValue: 10,
    recurrence: "daily" as Recurrence,
    daysOfWeek: [] as number[],
  };
}

export default function FamilyPage() {
  const { user } = useAuth();
  const { familyId, family, member } = useFamily();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState(emptyProposalForm);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [dailyTasksForDay, setDailyTasksForDay] = useState<DailyTask[]>([]);
  const [openRequests, setOpenRequests] = useState<TaskRequest[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<XpLedgerEntry[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
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

  // The leaderboard shows how much of each member's XP is currently locked
  // in an investment, alongside their real (spendable) balance the ranking
  // is actually based on — investments are readable by any family member,
  // same as everywhere else this appears.
  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "investments"), (snapshot) => {
      setInvestments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Investment));
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

  const selectedDateKey = dateKeyInFamilyZone(selectedDate);

  useEffect(() => {
    if (!familyId) return;
    const dailyTasksQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("date", "==", selectedDateKey)
    );
    return onSnapshot(dailyTasksQuery, (snapshot) => {
      setDailyTasksForDay(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
    });
  }, [familyId, selectedDateKey]);

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
      // A response to "chci nový úkol" is a one-off for the day the request
      // was made, not a standing chore — 'daily' here would keep generating
      // it every day forever, which is never what answering a single
      // request is meant to do.
      await addDoc(collection(getDb(), "families", familyId, "taskProposals"), {
        title: draft.title.trim(),
        category: "household",
        xpValue,
        recurrence: "once",
        date: dateKeyInFamilyZone(new Date()),
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

  // Parent-only moderation actions — remove a single stale/unwanted request
  // or proposal outright, regardless of whose it is or whether the normal
  // voting flow has run its course.
  async function handleRemoveRequest(request: TaskRequest) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskRequests", request.id), { status: "cancelled" });
      toast.success("Žádost odebrána.");
    } catch {
      toast.error("Žádost se nepodařilo odebrat.");
    }
  }

  async function handleRemoveProposal(proposal: TaskProposal) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskProposals", proposal.id), { status: "rejected" });
      toast.success("Návrh odebrán.");
    } catch {
      toast.error("Návrh se nepodařilo odebrat.");
    }
  }

  const monthDates = Array.from({ length: daysInMonth(viewMonth) }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1));
  const today = new Date();
  const isToday = isSameDay(selectedDate, today);

  function goToMonth(delta: number) {
    const next = addMonths(viewMonth, delta);
    setViewMonth(next);
    setSelectedDate(
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today : next
    );
  }

  const dueTemplates = templates.filter((t) => t.active && isDue(t, selectedDate));
  const byMember = members
    .map((m) => ({ member: m, tasks: dueTemplates.filter((t) => t.assignedTo.includes(m.id)) }))
    .filter((entry) => entry.tasks.length > 0);

  // A request is a one-shot, same-day ask — one left open from a previous
  // day (the nightly cron cancels those, but only runs once at 00:05)
  // shouldn't still show up asking for a proposal a day later.
  const todayOpenRequests = openRequests.filter((r) => r.date === dateKeyInFamilyZone(new Date()));

  return (
    <div className="flex flex-col gap-4">
      <Leaderboard
        members={members}
        levelTitles={family?.levelTitles}
        levelThresholds={family?.levelThresholds}
        ledgerEntries={ledgerEntries}
        investments={investments}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Úkoly celé rodiny</h1>
          <p className="text-sm text-zinc-500">
            {isToday ? "Dnes" : `${WEEKDAYS[selectedDate.getDay()]} ${selectedDate.getDate()}.`}
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

      {todayOpenRequests.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 font-medium">
            <Star size={16} className="text-accent" /> Žádosti o nový úkol
          </h2>
          {todayOpenRequests.map((request) => {
            const requester = members.find((m) => m.id === request.requestedBy);
            if (request.requestedBy === user?.uid) {
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm text-zinc-500"
                >
                  Čekáš na návrh úkolu od rodiny.
                  {member?.role === "parent" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRequest(request)}
                      aria-label="Odebrat žádost"
                      className="shrink-0 text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            }
            const draft = requestProposalDrafts[request.id] ?? { title: "", xpValue: "10" };
            return (
              <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {requester && <Avatar name={requester.name} avatarUrl={requester.avatarUrl} size="sm" />}
                    <p className="font-medium">{requester?.name ?? request.requestedBy} chce nový úkol</p>
                  </div>
                  {member?.role === "parent" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRequest(request)}
                      aria-label="Odebrat žádost"
                      className="shrink-0 text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
            const isOwn = proposal.proposedBy === user?.uid;
            const alreadyVoted = user ? proposal.approvals.includes(user.uid) : false;
            return (
              <div key={proposal.id} className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {categoryInfo(proposal.category).icon} {proposal.title} · +{formatXp(proposal.xpValue)} XP
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      Navrhl(a) {proposer?.name ?? proposal.proposedBy}
                      {target && ` pro ${target.name}`} · stačí schválení jednoho rodiče
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isOwn && !alreadyVoted && (
                      <>
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
                      </>
                    )}
                    {(isOwn || alreadyVoted) && <span className="text-sm text-zinc-400">Čeká na schválení rodiče</span>}
                    {member?.role === "parent" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProposal(proposal)}
                        aria-label="Odebrat návrh"
                        className="text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="Předchozí měsíc"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold capitalize">{MONTH_LABEL_FORMATTER.format(viewMonth)}</p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Následující měsíc"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
        {monthDates.map((date) => {
          const active = isSameDay(date, selectedDate);
          const isRealToday = isSameDay(date, today);
          return (
            <button
              key={date.getDate()}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`relative flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-zinc-500"
              }`}
            >
              {WEEKDAYS[date.getDay()]}
              <span className="text-[10px] font-normal">{date.getDate()}.</span>
              {isRealToday && !active && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
              )}
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
                      <span className="shrink-0 text-sm font-semibold text-accent">+{formatXp(template.xpValue)} XP</span>
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
