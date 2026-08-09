"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { addMonths, dateKeyInFamilyZone, daysInMonth, startOfMonth } from "@/lib/date-utils";
import { czechHolidayName } from "@/lib/czech-holidays";
import { CALENDAR_EVENT_CATEGORIES, CALENDAR_RECURRENCES, calendarEventCategoryInfo, eventOccursOnDate } from "@/lib/calendar-events";
import Avatar from "@/components/Avatar";
import type { CalendarEvent, CalendarEventCategory, CalendarRecurrence, Member } from "@/lib/types";

// Monday-first display order, matching how the grid below is laid out.
const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" });

function emptyForm(dateKey: string, defaultMemberIds: string[]) {
  return {
    title: "",
    date: dateKey,
    category: "other" as CalendarEventCategory,
    recurrence: "none" as CalendarRecurrence,
    memberIds: defaultMemberIds,
  };
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  // The one day whose popup (existing reminders + "add another") is open —
  // this is the only interaction surface now: tap any day, view what's
  // there, optionally add more, on top of the general "+ Přidat" shortcut.
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Safe to read user.uid synchronously here — DashboardLayout only ever
  // renders this page once auth has resolved.
  const [form, setForm] = useState(() => emptyForm(dateKeyInFamilyZone(new Date()), user ? [user.uid] : []));
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

  const todayKey = dateKeyInFamilyZone(new Date());
  const leadingBlanks = (startOfMonth(viewMonth).getDay() + 6) % 7; // Mon=0..Sun=6
  const monthDates = Array.from(
    { length: daysInMonth(viewMonth) },
    (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
  );

  function eventsFor(dateKey: string): CalendarEvent[] {
    return events.filter((e) => eventOccursOnDate(e, dateKey)).sort((a, b) => a.timestamp - b.timestamp);
  }

  function canDelete(evt: CalendarEvent): boolean {
    return evt.createdBy === user?.uid || isParent;
  }

  function openDay(dateKey: string) {
    setOpenDateKey(dateKey);
    setShowAddForm(false);
    setForm(emptyForm(dateKey, user ? [user.uid] : []));
  }

  function toggleFormMember(memberId: string) {
    if (!isParent) return;
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !form.date || !form.title.trim()) return;
    const memberIds = isParent ? form.memberIds : [user.uid];
    if (memberIds.length === 0) return;
    setSubmitting(true);
    try {
      // One doc per selected member — e.g. a family vacation gets a
      // reminder on every member's own record, not just the person who
      // added it, so "kdo má co" stays accurate per person even though
      // they were all added in a single action.
      const batch = writeBatch(getDb());
      for (const memberId of memberIds) {
        batch.set(doc(collection(getDb(), "families", familyId, "calendarEvents")), {
          title: form.title.trim(),
          date: form.date,
          category: form.category,
          recurrence: form.recurrence,
          memberId,
          createdBy: user.uid,
          timestamp: Date.now(),
        });
      }
      await batch.commit();
      toast.success(memberIds.length > 1 ? "Přidáno do kalendáře pro vybrané členy." : "Přidáno do kalendáře.");
      setShowAddForm(false);
      setForm(emptyForm(openDateKey ?? form.date, [user.uid]));
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

  const openDayEvents = openDateKey ? eventsFor(openDateKey) : [];
  const openDayDate = openDateKey ? new Date(`${openDateKey}T00:00:00`) : null;
  const openDayLabel = openDayDate
    ? openDayDate.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const openDayHoliday = openDayDate ? czechHolidayName(openDayDate) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Plánovací kalendář</h1>
          <p className="text-sm text-zinc-500">
            Připomínky mimo naplánované úkoly — lékař, narozeniny, svátky, dovolené…
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            openDay(todayKey);
            setShowAddForm(true);
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          <Plus size={16} /> Přidat
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          aria-label="Předchozí měsíc"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold capitalize">{MONTH_LABEL_FORMATTER.format(viewMonth)}</p>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          aria-label="Následující měsíc"
          className="shrink-0 rounded-full p-1.5 text-zinc-500 hover:text-accent"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-500">
        {WEEKDAYS.map((label, i) => (
          <div key={label} className={i >= 5 ? "text-accent" : ""}>
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {monthDates.map((date) => {
          const dateKey = dateKeyInFamilyZone(date);
          const isToday = dateKey === todayKey;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const holiday = czechHolidayName(date);
          const hasEvents = eventsFor(dateKey).length > 0;
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => openDay(dateKey)}
              title={holiday}
              className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm ${
                isToday ? "ring-2 ring-accent" : ""
              } ${holiday ? "bg-danger/10 text-danger" : isWeekend ? "bg-surface-muted text-zinc-600" : "bg-surface"}`}
            >
              <span className={isToday ? "font-bold" : ""}>{date.getDate()}</span>
              {hasEvents && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {openDateKey && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex max-h-[88vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize">{openDayLabel}</h2>
              <button
                type="button"
                onClick={() => setOpenDateKey(null)}
                aria-label="Zavřít"
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>

            {openDayHoliday && <p className="text-sm font-medium text-danger">{openDayHoliday}</p>}

            {openDayEvents.length === 0 ? (
              <p className="text-sm text-zinc-500">Žádné záznamy na tento den.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {openDayEvents.map((evt) => {
                  const evtMember = members.find((m) => m.id === evt.memberId);
                  return (
                    <div key={evt.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                      <span className="shrink-0 text-xl">{calendarEventCategoryInfo(evt.category).icon}</span>
                      {evtMember && <Avatar name={evtMember.name} avatarUrl={evtMember.avatarUrl} size="sm" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{evt.title}</p>
                        {evtMember && <p className="truncate text-xs text-zinc-500">{evtMember.name}</p>}
                      </div>
                      {canDelete(evt) && (
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

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                <Plus size={16} /> Přidat další
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-3">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Co si připomenout?"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-lg border border-border bg-surface px-4 py-2"
                />
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-500">Datum</p>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="rounded-lg border border-border bg-surface px-4 py-2"
                  />
                </div>
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
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-zinc-500">Opakování</p>
                  <div className="flex flex-wrap gap-2">
                    {CALENDAR_RECURRENCES.map((rec) => (
                      <button
                        key={rec.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, recurrence: rec.value }))}
                        className={`rounded-full px-3 py-1.5 text-sm ${
                          form.recurrence === rec.value ? "bg-accent text-accent-foreground" : "border border-border"
                        }`}
                      >
                        {rec.label}
                      </button>
                    ))}
                  </div>
                </div>
                {isParent && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-zinc-500">
                      Pro koho — vyber i víc lidí najednou (např. dovolená pro celou rodinu)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleFormMember(m.id)}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            form.memberIds.includes(m.id) ? "bg-accent text-accent-foreground" : "border border-border"
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
                    disabled={submitting || !form.title.trim() || !form.date || (isParent && form.memberIds.length === 0)}
                    className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                  >
                    Uložit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
                  >
                    Zrušit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
