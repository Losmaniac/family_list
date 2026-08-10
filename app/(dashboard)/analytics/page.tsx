"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { BarChart3, Table2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { formatXp } from "@/lib/xp-engine";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import {
  CATEGORY_INFO,
  CATEGORY_ORDER,
  DATE_RANGE_PRESET_LABELS,
  categoryForReason,
  filterXpEntries,
  reasonLabel,
  startMsForPreset,
  totalsByDay,
  totalsByMember,
  totalsByMemberAndCategory,
  type DateRangePreset,
  type XpReasonCategory,
} from "@/lib/xp-analytics";
import Avatar from "@/components/Avatar";
import InfoButton from "@/components/InfoButton";
import type { Member, XpLedgerEntry } from "@/lib/types";

const MAX_TREND_DAYS = 60;

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function AnalyticsPage() {
  const { familyId, member } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<XpLedgerEntry[]>([]);

  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<XpReasonCategory>>(new Set());
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "xpLedger"), (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpLedgerEntry));
    });
  }, [familyId]);

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const { startMs, endMs } = useMemo(() => {
    if (preset === "all") return { startMs: undefined, endMs: undefined };
    if (preset === "custom") {
      return {
        startMs: customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : undefined,
        endMs: customTo ? new Date(`${customTo}T23:59:59.999`).getTime() : undefined,
      };
    }
    return { startMs: startMsForPreset(preset), endMs: undefined };
  }, [preset, customFrom, customTo]);

  const filtered = useMemo(
    () =>
      filterXpEntries(entries, {
        startMs,
        endMs,
        memberIds: [...selectedMemberIds],
        categories: [...selectedCategories],
      }),
    [entries, startMs, endMs, selectedMemberIds, selectedCategories]
  );

  const totals = useMemo(() => totalsByMember(filtered), [filtered]);
  const totalsByCategory = useMemo(() => totalsByMemberAndCategory(filtered), [filtered]);
  const dayTotals = useMemo(() => totalsByDay(filtered), [filtered]);

  const rankedMembers = useMemo(
    () =>
      [...members]
        .filter((m) => (totals[m.id] ?? 0) !== 0 || entries.some((e) => e.userId === m.id))
        .sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0)),
    [members, totals, entries]
  );
  const maxMemberTotal = Math.max(1, ...rankedMembers.map((m) => Math.abs(totals[m.id] ?? 0)));

  const presentCategories = useMemo(() => {
    const seen = new Set<XpReasonCategory>();
    for (const e of filtered) seen.add(categoryForReason(e.reason));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [filtered]);

  const trendDays = useMemo(() => Object.keys(dayTotals).sort().slice(-MAX_TREND_DAYS), [dayTotals]);
  const maxDayTotal = Math.max(1, ...trendDays.map((d) => Math.abs(dayTotals[d])));

  const sortedEntries = useMemo(() => [...filtered].sort((a, b) => b.timestamp - a.timestamp), [filtered]);

  if (member?.role !== "parent") {
    return <p className="text-zinc-500">Dostupné pouze pro rodiče.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-1.5">
        <h1 className="text-xl font-semibold">Statistiky</h1>
        <InfoButton
          title="Statistiky"
          description="Rozpad XP podle člena, kategorie a data — data se čerpají přímo z xpLedger (stejný zdroj jako XP zůstatek každého člena). Filtry níž se vztahují na všechny grafy i na tabulku pod nimi."
        />
      </div>

      {/* Filters — one row, above everything they scope. */}
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DATE_RANGE_PRESET_LABELS) as DateRangePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1.5 text-sm ${preset === p ? "bg-accent text-accent-foreground" : "border border-border"}`}
            >
              {DATE_RANGE_PRESET_LABELS[p]}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5">
              Od
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-base"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Do
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-base"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMemberIds((prev) => toggleInSet(prev, m.id))}
              className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ${
                selectedMemberIds.size === 0 || selectedMemberIds.has(m.id)
                  ? "border border-border"
                  : "border border-border opacity-40"
              }`}
            >
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              {m.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategories((prev) => toggleInSet(prev, c))}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                selectedCategories.size === 0 || selectedCategories.has(c) ? "border border-border" : "border border-border opacity-40"
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_INFO[c].colorVar }} />
              {CATEGORY_INFO[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Celkem XP za období</h2>
        {rankedMembers.length === 0 ? (
          <p className="text-sm text-zinc-500">Žádná data pro zvolený filtr.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rankedMembers.map((m) => {
              const total = totals[m.id] ?? 0;
              const widthPct = (Math.abs(total) / maxMemberTotal) * 100;
              return (
                <div key={m.id} className="flex items-center gap-3" title={`${m.name}: ${formatXp(total)} XP`}>
                  <div className="flex w-28 shrink-0 items-center gap-2 text-sm">
                    <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <span className="truncate">{m.name}</span>
                  </div>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={`h-full rounded-full ${total < 0 ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">{formatXp(total)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Category breakdown per member */}
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Rozpad podle kategorie</h2>
        {presentCategories.length === 0 ? (
          <p className="text-sm text-zinc-500">Žádná data pro zvolený filtr.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500">
              {presentCategories.map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_INFO[c].colorVar }} />
                  {CATEGORY_INFO[c].label}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {rankedMembers.map((m) => {
                const byCategory = totalsByCategory[m.id] ?? {};
                const positiveTotal = presentCategories.reduce((sum, c) => sum + Math.max(0, byCategory[c] ?? 0), 0);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="flex w-28 shrink-0 items-center gap-2 text-sm">
                      <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                      <span className="truncate">{m.name}</span>
                    </div>
                    <div className="flex h-6 flex-1 gap-0.5 overflow-hidden rounded-full bg-surface-muted p-0.5">
                      {positiveTotal <= 0
                        ? null
                        : presentCategories.map((c) => {
                            const value = Math.max(0, byCategory[c] ?? 0);
                            if (value === 0) return null;
                            return (
                              <div
                                key={c}
                                title={`${CATEGORY_INFO[c].label}: ${formatXp(value)} XP`}
                                className="h-full rounded-full"
                                style={{ width: `${(value / positiveTotal) * 100}%`, backgroundColor: CATEGORY_INFO[c].colorVar }}
                              />
                            );
                          })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Daily trend */}
      {trendDays.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-1.5 font-medium">
            <BarChart3 size={16} className="shrink-0 text-zinc-400" />
            Vývoj v čase
          </h2>
          <div className="flex h-24 items-end gap-0.5 overflow-x-auto">
            {trendDays.map((day) => {
              const value = dayTotals[day];
              const heightPct = Math.max(4, (Math.abs(value) / maxDayTotal) * 100);
              return (
                <div
                  key={day}
                  title={`${day}: ${formatXp(value)} XP`}
                  className={`w-2 shrink-0 rounded-t-sm ${value < 0 ? "bg-danger" : "bg-accent"}`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            {trendDays[0]} – {trendDays[trendDays.length - 1]}
          </p>
        </section>
      )}

      {/* Raw entries table */}
      <section className="flex flex-col gap-3">
        <button type="button" onClick={() => setShowTable((v) => !v)} className="flex items-center gap-1.5 self-start text-sm font-semibold text-accent">
          <Table2 size={16} />
          {showTable ? "Skrýt jednotlivé záznamy" : `Zobrazit jednotlivé záznamy (${sortedEntries.length})`}
        </button>
        {showTable && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Kdy</th>
                  <th className="px-3 py-2 font-medium">Kdo</th>
                  <th className="px-3 py-2 font-medium">Důvod</th>
                  <th className="px-3 py-2 text-right font-medium">XP</th>
                  <th className="px-3 py-2 font-medium">Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((e) => {
                  const category = categoryForReason(e.reason);
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-500">{formatDateTimeInFamilyZone(new Date(e.timestamp))}</td>
                      <td className="whitespace-nowrap px-3 py-2">{membersById.get(e.userId)?.name ?? "?"}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_INFO[category].colorVar }} />
                          {reasonLabel(e.reason)}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${e.delta < 0 ? "text-danger" : "text-success"}`}>
                        {e.delta > 0 ? "+" : ""}
                        {formatXp(e.delta)}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{e.note ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
