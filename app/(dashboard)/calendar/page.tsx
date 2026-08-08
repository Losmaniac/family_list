"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { addDays, dateKeyInFamilyZone, startOfWeek } from "@/lib/date-utils";
import { CALENDAR_EVENT_CATEGORIES, calendarEventCategoryInfo } from "@/lib/calendar-events";
import Avatar from "@/components/Avatar";
import type { CalendarEvent, CalendarEventCategory, Member } from "@/lib/types";

// Display order Po..Ne — weekDates below is always built from a Monday
// startOfWeek, so a date's index in that array already matches this order.
const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function emptyForm(defaultMemberId: string, defaultDate: string) {
  return { title: "", date: defaultDate, category: "other" as CalendarEventCategory, memberId: defaultMemberId };
}

function weekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = `${weekStart.getDate()}. ${weekStart.getMonth() + 1}.`;
  const endLabel = `${weekEnd.getDate()}. ${weekEnd.getMonth() + 1}. ${weekEnd.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showForm, setShowForm] = useState(false);
  // Safe to read user.uid synchronously here — DashboardLayout only ever
  // renders this page once auth has resolved.
  const [form, setForm] = useState(() => emptyForm(user?.uid ?? "", dateKeyInFamilyZone(new Date())));
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
    return onSnapshot(collection(getDb(), "families", familyId, "calendarEvents"), (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent));
    });
  }, [familyId]);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dateKeyInFamilyZone(new Date());

  function eventsFor(dateKey: string, memberId: string): CalendarEvent[] {
    return events
      .filter((e) => e.date === dateKey && e.memberId === memberId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function canAddFor(memberId: string): boolean {
    return isParent || memberId === user?.uid;
  }

  function canDelete(evt: CalendarEvent): boolean {
    return evt.createdBy === user?.uid || isParent;
  }

  function openFormFor(dateKey: string, memberId: string) {
    setForm({ title: "", date: dateKey, category: "other", memberId });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !form.title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "calendarEvents"), {
        title: form.title.trim(),
        date: form.date,
        category: form.category,
        memberId: isParent ? form.memberId : user.uid,
        createdBy: user.uid,
        timestamp: Date.now(),
      });
      toast.success("Přidáno do kalendáře.");
      setShowForm(false);
    } catch {
      toast.error("Nepodařilo se přidat záznam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(evt: CalendarEvent) {
    if (!familyId) return;
    const ok = await confirm({
      title: "Smazat záznam?",
      description: `„${evt.title}“ bude z kalendáře odstraněn.`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "calendarEvents", evt.id));
    } catch {
      toast.error("Nepodařilo se smazat záznam.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Plánovací kalendář</h1>
          <p className="text-sm text-zinc-500">
            Připomínky mimo naplánované úkoly — lékař, narozeniny, svátky, dovolené…
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => openFormFor(dateKeyInFamilyZone(new Date()), user?.uid ?? "")}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <Plus size={16} /> Přidat
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          aria-label="Předchozí týden"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="text-sm font-semibold"
        >
          {weekRangeLabel(weekStart)}
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          aria-label="Následující týden"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Co si připomenout?"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {CALENDAR_EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category: cat.value }))}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  form.category === cat.value ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          {isParent && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-zinc-500">Pro koho</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, memberId: m.id }))}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      form.memberId === m.id ? "bg-accent text-accent-foreground" : "border border-border"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
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

      {/* Grid: a fixed weekday-label column, then one column per family
          member — rows are the days of the currently viewed week, so a
          parent can see at a glance who has what coming up without
          clicking through each day one at a time. */}
      <div className="overflow-x-auto overscroll-x-contain">
        <div
          className="grid min-w-max gap-px overflow-hidden rounded-xl border border-border bg-border"
          style={{ gridTemplateColumns: `44px repeat(${Math.max(members.length, 1)}, minmax(104px, 1fr))` }}
        >
          <div className="bg-surface" />
          {members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1 bg-surface px-1 py-2">
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              <span className="max-w-full truncate text-xs font-medium">{m.name}</span>
            </div>
          ))}

          {weekDates.map((date, dayIndex) => {
            const dateKey = dateKeyInFamilyZone(date);
            const isToday = dateKey === todayKey;
            return (
              <div key={dateKey} className="contents">
                <div
                  className={`flex flex-col items-center justify-start gap-0.5 bg-surface px-1 py-2 text-xs font-semibold ${
                    isToday ? "text-accent" : "text-zinc-500"
                  }`}
                >
                  <span>{WEEKDAYS[dayIndex]}</span>
                  <span className="text-[10px] font-normal">{date.getDate()}.</span>
                </div>
                {members.map((m) => {
                  const dayEvents = eventsFor(dateKey, m.id);
                  const addable = canAddFor(m.id);
                  return (
                    // A div, not a button — it holds each event's own delete
                    // button, and nesting <button> inside <button> is
                    // invalid HTML. addable clicks add a new reminder;
                    // clicks on a chip's own delete button stop propagation
                    // so they don't also trigger this.
                    <div
                      key={`${dateKey}-${m.id}`}
                      role={addable ? "button" : undefined}
                      tabIndex={addable ? 0 : undefined}
                      onClick={addable ? () => openFormFor(dateKey, m.id) : undefined}
                      onKeyDown={
                        addable
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") openFormFor(dateKey, m.id);
                            }
                          : undefined
                      }
                      className={`flex min-h-[52px] flex-col gap-1 bg-surface p-1 ${
                        isToday ? "bg-accent/5" : ""
                      } ${addable ? "cursor-pointer hover:bg-surface-muted" : ""}`}
                    >
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-1 text-[11px]"
                        >
                          <span className="shrink-0">{calendarEventCategoryInfo(evt.category).icon}</span>
                          <span className="min-w-0 flex-1 truncate">{evt.title}</span>
                          {canDelete(evt) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(evt);
                              }}
                              aria-label="Smazat záznam"
                              className="shrink-0 text-zinc-400 hover:text-danger"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
