"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { SCHEDULE_DAY_LABELS, SCHEDULE_MAX_PERIODS, normalizeScheduleDays } from "@/lib/schedule";
import Avatar from "@/components/Avatar";
import type { ClassSchedule, Member } from "@/lib/types";

export default function SchedulePage() {
  const { user } = useAuth();
  const { familyId, family, member } = useFamily();
  const toast = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ClassSchedule>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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
    async (memberId: string, dayIndex: number, periodIndex: number, value: string) => {
      if (!familyId) return;
      const currentDays = normalizeScheduleDays(schedules[memberId]?.days);
      const nextDays = currentDays.map((periods, di) =>
        di === dayIndex ? periods.map((p, pi) => (pi === periodIndex ? value : p)) : periods
      );
      try {
        await setDoc(doc(getDb(), "families", familyId, "schedules", memberId), {
          days: nextDays,
          updatedAt: Date.now(),
        });
      } catch {
        toast.error("Rozvrh se nepodařilo uložit.");
      }
    },
    [familyId, schedules, toast]
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Rozvrh hodin</h1>
        <p className="text-sm text-zinc-500">
          {canSeeEveryone
            ? "Rozvrhy členů rodiny — klikni na jméno pro přepnutí."
            : "Tvůj rozvrh hodin."}
        </p>
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

      {selected && (
        <div
          className="grid w-full gap-px overflow-hidden rounded-xl border border-border bg-border"
          style={{ gridTemplateColumns: `22px repeat(${SCHEDULE_DAY_LABELS.length}, 1fr)` }}
        >
          <div className="bg-surface" />
          {SCHEDULE_DAY_LABELS.map((label) => (
            <div key={label} className="bg-surface px-0.5 py-1.5 text-center text-[10px] font-semibold text-zinc-500">
              {label.slice(0, 2)}
            </div>
          ))}

          {Array.from({ length: SCHEDULE_MAX_PERIODS }, (_, periodIndex) => (
            <div key={periodIndex} className="contents">
              <div className="flex items-center justify-center bg-surface text-[10px] font-semibold text-zinc-400">
                {periodIndex + 1}.
              </div>
              {SCHEDULE_DAY_LABELS.map((_, dayIndex) => (
                <input
                  key={dayIndex}
                  type="text"
                  disabled={!canEditSelected}
                  value={days[dayIndex][periodIndex]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSchedules((prev) => {
                      const current = normalizeScheduleDays(prev[selected]?.days);
                      const nextDays = current.map((periods, di) =>
                        di === dayIndex ? periods.map((p, pi) => (pi === periodIndex ? value : p)) : periods
                      );
                      return {
                        ...prev,
                        [selected]: { memberId: selected, days: nextDays, updatedAt: prev[selected]?.updatedAt ?? 0 },
                      };
                    });
                  }}
                  onBlur={(e) => {
                    if (!selected || !canEditSelected) return;
                    handleCellChange(selected, dayIndex, periodIndex, e.target.value);
                  }}
                  placeholder="—"
                  className="min-w-0 bg-surface px-0.5 py-1.5 text-center text-[11px] disabled:text-zinc-400"
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
