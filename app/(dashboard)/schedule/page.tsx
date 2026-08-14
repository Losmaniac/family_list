"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { Columns3, Rows3 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import {
  SCHEDULE_DAY_LABELS,
  SCHEDULE_MAX_PERIODS,
  SCHEDULE_PERIOD_TIMES,
  daysToFirestoreMap,
  normalizeScheduleDays,
} from "@/lib/schedule";
import Avatar from "@/components/Avatar";
import type { ClassSchedule, Member, ScheduleCell } from "@/lib/types";

type ScheduleOrientation = "columns" | "rows";

function orientationStorageKey(uid: string): string {
  return `schedule-orientation:${uid}`;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { familyId, family, member } = useFamily();
  const toast = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ClassSchedule>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  // "columns" = dny jako sloupce (výchozí, jako v papírovém rozvrhu); "rows"
  // = dny jako řádky, hodiny jako sloupce. Ryze zobrazovací preference,
  // uložená jen v prohlížeči (lib/schedule.ts nese jen samotná data).
  const [orientation, setOrientation] = useState<ScheduleOrientation>("columns");
  const [loadedOrientationForUid, setLoadedOrientationForUid] = useState<string | null>(null);

  // Adjusts state during render rather than in an effect (same pattern as
  // the nav order in app/(dashboard)/layout.tsx) — applies this member's
  // saved orientation the first render where `user` is actually known,
  // without an extra post-mount flash of the default.
  if (user && loadedOrientationForUid !== user.uid) {
    setLoadedOrientationForUid(user.uid);
    const stored = localStorage.getItem(orientationStorageKey(user.uid));
    if (stored === "columns" || stored === "rows") setOrientation(stored);
  }

  function changeOrientation(next: ScheduleOrientation) {
    setOrientation(next);
    if (user) localStorage.setItem(orientationStorageKey(user.uid), next);
  }

  const isParent = member?.role === "parent";
  const canSeeEveryone = isParent || family?.scheduleVisibleToAll === true;

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "schedules"), (snapshot) => {
      const next: Record<string, ClassSchedule> = {};
      for (const d of snapshot.docs) next[d.id] = { memberId: d.id, ...d.data() } as ClassSchedule;
      setSchedules(next);
    });
  }, [familyId]);

  const visibleMembers = canSeeEveryone ? members : members.filter((m) => m.id === user?.uid);
  const selected = selectedMemberId ?? user?.uid ?? null;
  const canEditSelected = Boolean(selected) && (isParent || selected === user?.uid);
  const days = normalizeScheduleDays(schedules[selected ?? ""]?.days);

  const handleCellChange = useCallback(
    async (memberId: string, dayIndex: number, periodIndex: number, cell: ScheduleCell) => {
      if (!familyId) return;
      const currentDays = normalizeScheduleDays(schedules[memberId]?.days);
      const nextDays = currentDays.map((periods, di) =>
        di === dayIndex ? periods.map((p, pi) => (pi === periodIndex ? cell : p)) : periods
      );
      try {
        await setDoc(doc(getDb(), "families", familyId, "schedules", memberId), {
          days: daysToFirestoreMap(nextDays),
          updatedAt: Date.now(),
        });
      } catch {
        toast.error("Rozvrh se nepodařilo uložit.");
      }
    },
    [familyId, schedules, toast]
  );

  function updateLocalCell(dayIndex: number, periodIndex: number, patch: Partial<ScheduleCell>) {
    if (!selected) return;
    setSchedules((prev) => {
      const current = normalizeScheduleDays(prev[selected]?.days);
      const nextDays = current.map((periods, di) =>
        di === dayIndex ? periods.map((p, pi) => (pi === periodIndex ? { ...p, ...patch } : p)) : periods
      );
      return {
        ...prev,
        [selected]: {
          memberId: selected,
          days: daysToFirestoreMap(nextDays),
          updatedAt: prev[selected]?.updatedAt ?? 0,
        },
      };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Rozvrh hodin</h1>
          <p className="text-sm text-zinc-500">
            {canSeeEveryone
              ? "Rozvrhy členů rodiny — klikni na jméno pro přepnutí."
              : "Tvůj rozvrh hodin."}
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-full border border-border p-1 text-sm">
          <button
            type="button"
            onClick={() => changeOrientation("columns")}
            aria-label="Dny jako sloupce"
            title="Dny jako sloupce"
            className={`flex items-center justify-center rounded-full p-1.5 ${
              orientation === "columns" ? "bg-accent text-accent-foreground" : "text-zinc-500"
            }`}
          >
            <Columns3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => changeOrientation("rows")}
            aria-label="Dny jako řádky"
            title="Dny jako řádky"
            className={`flex items-center justify-center rounded-full p-1.5 ${
              orientation === "rows" ? "bg-accent text-accent-foreground" : "text-zinc-500"
            }`}
          >
            <Rows3 size={16} />
          </button>
        </div>
      </div>

      {visibleMembers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {visibleMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMemberId(m.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                selected === m.id ? "bg-accent text-accent-foreground" : "border border-border"
              }`}
            >
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              {m.name}
            </button>
          ))}
        </div>
      )}

      {selected &&
        (() => {
          const daysAsColumns = orientation === "columns";
          const outerCount = daysAsColumns ? SCHEDULE_MAX_PERIODS : SCHEDULE_DAY_LABELS.length;
          const innerCount = daysAsColumns ? SCHEDULE_DAY_LABELS.length : SCHEDULE_MAX_PERIODS;

          function periodHeader(periodIndex: number) {
            return (
              <div key={periodIndex} className="flex flex-col items-center justify-center gap-0.5 bg-surface px-0.5 py-1.5 text-center">
                <span className="text-[10px] font-semibold text-zinc-400">{periodIndex + 1}.</span>
                <span className="text-[8px] leading-tight text-zinc-400">{SCHEDULE_PERIOD_TIMES[periodIndex]}</span>
              </div>
            );
          }

          return (
            <div className="overflow-x-auto">
              <div
                className="grid gap-px overflow-hidden rounded-xl border border-border bg-border"
                style={{
                  gridTemplateColumns: `44px repeat(${innerCount}, minmax(${daysAsColumns ? "0" : "88px"}, 1fr))`,
                }}
              >
                <div className="bg-surface" />
                {Array.from({ length: innerCount }, (_, innerIndex) =>
                  daysAsColumns ? (
                    <div
                      key={innerIndex}
                      className="bg-surface px-0.5 py-1.5 text-center text-[10px] font-semibold text-zinc-500"
                    >
                      {SCHEDULE_DAY_LABELS[innerIndex].slice(0, 2)}
                    </div>
                  ) : (
                    periodHeader(innerIndex)
                  )
                )}

                {Array.from({ length: outerCount }, (_, outerIndex) => (
                  <div key={outerIndex} className="contents">
                    {daysAsColumns ? (
                      periodHeader(outerIndex)
                    ) : (
                      <div className="flex items-center justify-center bg-surface px-0.5 py-1.5 text-center text-[10px] font-semibold text-zinc-500">
                        {SCHEDULE_DAY_LABELS[outerIndex].slice(0, 2)}
                      </div>
                    )}
                    {Array.from({ length: innerCount }, (_, innerIndex) => {
                      const dayIndex = daysAsColumns ? innerIndex : outerIndex;
                      const periodIndex = daysAsColumns ? outerIndex : innerIndex;
                      const cell = days[dayIndex][periodIndex];
                      return (
                        <div key={innerIndex} className="flex min-w-0 flex-col gap-0.5 bg-surface px-0.5 py-1">
                          <input
                            type="text"
                            disabled={!canEditSelected}
                            value={cell.subject}
                            onChange={(e) => updateLocalCell(dayIndex, periodIndex, { subject: e.target.value })}
                            onBlur={(e) => {
                              if (!selected || !canEditSelected) return;
                              handleCellChange(selected, dayIndex, periodIndex, { ...cell, subject: e.target.value });
                            }}
                            placeholder="—"
                            className="min-w-0 bg-transparent text-center text-[11px] disabled:text-zinc-400"
                          />
                          <input
                            type="text"
                            disabled={!canEditSelected}
                            value={cell.teacher ?? ""}
                            onChange={(e) => updateLocalCell(dayIndex, periodIndex, { teacher: e.target.value || undefined })}
                            onBlur={(e) => {
                              if (!selected || !canEditSelected) return;
                              handleCellChange(selected, dayIndex, periodIndex, {
                                ...cell,
                                teacher: e.target.value || undefined,
                              });
                            }}
                            placeholder="učitel"
                            className="min-w-0 bg-transparent text-center text-[9px] text-zinc-400 disabled:text-zinc-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
