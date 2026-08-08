"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { addMonths, dateKeyInFamilyZone, daysInMonth, isSameDay, startOfMonth } from "@/lib/date-utils";
import { CALENDAR_EVENT_CATEGORIES, calendarEventCategoryInfo } from "@/lib/calendar-events";
import Avatar from "@/components/Avatar";
import type { CalendarEvent, CalendarEventCategory, Member } from "@/lib/types";

// JS Date.getDay() convention (0=Sun..6=Sat).
const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" });

function emptyForm(defaultMemberId: string) {
  return { title: "", category: "other" as CalendarEventCategory, memberId: defaultMemberId };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  // Safe to read user.uid synchronously here — DashboardLayout only ever
  // renders this page once auth has resolved.
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
    return onSnapshot(collection(getDb(), "families", familyId, "calendarEvents"), (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent));
    });
  }, [familyId]);

  const monthDates = Array.from(
    { length: daysInMonth(viewMonth) },
    (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
  );
  const today = new Date();

  function goToMonth(delta: number) {
    const next = addMonths(viewMonth, delta);
    setViewMonth(next);
    setSelectedDate(
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today : next
    );
  }

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const evt of events) {
    const list = eventsByDate.get(evt.date) ?? [];
    list.push(evt);
    eventsByDate.set(evt.date, list);
  }

  const selectedDateKey = dateKeyInFamilyZone(selectedDate);
  const selectedDayEvents = (eventsByDate.get(selectedDateKey) ?? []).sort((a, b) => a.timestamp - b.timestamp);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !form.title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "calendarEvents"), {
        title: form.title.trim(),
        date: selectedDateKey,
        category: form.category,
        memberId: isParent ? form.memberId : user.uid,
        createdBy: user.uid,
        timestamp: Date.now(),
      });
      toast.success("Přidáno do kalendáře.");
      setForm(emptyForm(user.uid));
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
            onClick={() => setShowForm(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <Plus size={16} /> Přidat
          </button>
        )}
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
          <p className="text-xs text-zinc-500">
            Datum: {WEEKDAYS[selectedDate.getDay()]} {selectedDate.getDate()}. {selectedDate.getMonth() + 1}.{" "}
            {selectedDate.getFullYear()}
          </p>
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
          const hasEvents = (eventsByDate.get(dateKeyInFamilyZone(date)) ?? []).length > 0;
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
              {hasEvents && (
                <span
                  className={`absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full ${
                    active ? "bg-accent-foreground" : "bg-accent"
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDayEvents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <CalendarDays size={40} />
          <p className="text-lg">Žádné záznamy na tento den.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {selectedDayEvents.map((evt) => {
            const evtMember = members.find((m) => m.id === evt.memberId);
            const canDelete = evt.createdBy === user?.uid || isParent;
            return (
              <div key={evt.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <span className="shrink-0 text-xl">{calendarEventCategoryInfo(evt.category).icon}</span>
                {evtMember && <Avatar name={evtMember.name} avatarUrl={evtMember.avatarUrl} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{evt.title}</p>
                  {evtMember && <p className="truncate text-xs text-zinc-500">{evtMember.name}</p>}
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(evt)}
                    aria-label="Smazat záznam"
                    className="shrink-0 text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
