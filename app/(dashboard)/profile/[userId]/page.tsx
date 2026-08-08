"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { use } from "react";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { computeAchievements } from "@/lib/achievements";
import { dateKeyInFamilyZone } from "@/lib/date-utils";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import StreakBadge from "@/components/StreakBadge";
import type { DailyTask, Member, XpLedgerEntry } from "@/lib/types";

const STATS_DAYS = 14;

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(dateKeyInFamilyZone(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

const REASON_LABELS: Record<string, string> = {
  task_completed: "Splněný úkol",
  task_reverted: "Zrušené splnění úkolu",
  reward_redeemed: "Uplatněná odměna",
  manual_adjustment: "Ruční úprava XP",
  pooled_contribution: "Příspěvek do sbírky",
  investment_started: "Investice založena",
  investment_matured: "Investice vyplacena",
  investment_withdrawn_early: "Investice vybrána předčasně",
};

interface ProfilePageProps {
  params: Promise<{ userId: string }>;
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = use(params);
  const { familyId, family } = useFamily();
  const [profile, setProfile] = useState<Member | null>(null);
  const [ledger, setLedger] = useState<XpLedgerEntry[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [statsLedger, setStatsLedger] = useState<XpLedgerEntry[]>([]);
  const [statsTasks, setStatsTasks] = useState<DailyTask[]>([]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(doc(getDb(), "families", familyId, "members", userId), (snap) => {
      setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as Member) : null);
    });
  }, [familyId, userId]);

  useEffect(() => {
    if (!familyId) return;
    const ledgerQuery = query(
      collection(getDb(), "families", familyId, "xpLedger"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(15)
    );
    return onSnapshot(ledgerQuery, (snapshot) => {
      setLedger(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpLedgerEntry));
    });
  }, [familyId, userId]);

  useEffect(() => {
    if (!familyId) return;
    const countQuery = query(
      collection(getDb(), "families", familyId, "xpLedger"),
      where("userId", "==", userId),
      where("reason", "==", "task_completed")
    );
    getCountFromServer(countQuery).then((snap) => setCompletedCount(snap.data().count));
  }, [familyId, userId, ledger.length]);

  useEffect(() => {
    if (!familyId) return;
    const cutoff = Date.now() - STATS_DAYS * 24 * 60 * 60 * 1000;
    const statsQuery = query(
      collection(getDb(), "families", familyId, "xpLedger"),
      where("userId", "==", userId),
      where("timestamp", ">=", cutoff),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(statsQuery, (snapshot) => {
      setStatsLedger(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpLedgerEntry));
    });
  }, [familyId, userId]);

  useEffect(() => {
    if (!familyId) return;
    const cutoffDate = lastNDays(STATS_DAYS)[0];
    const tasksQuery = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("assignedTo", "==", userId),
      where("date", ">=", cutoffDate)
    );
    return onSnapshot(tasksQuery, (snapshot) => {
      setStatsTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DailyTask));
    });
  }, [familyId, userId]);

  if (!profile) {
    return <p className="text-zinc-500">Načítání…</p>;
  }

  const achievements = computeAchievements(profile.longestStreak ?? 0, completedCount);
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  const days = lastNDays(STATS_DAYS);
  const dailyXp = days.map((day) =>
    statsLedger
      .filter((entry) => dateKeyInFamilyZone(new Date(entry.timestamp)) === day)
      .reduce((sum, entry) => sum + entry.delta, 0)
  );
  const maxDailyXp = Math.max(1, ...dailyXp.map((xp) => Math.abs(xp)));

  const doneCount = statsTasks.filter((t) => t.status === "done").length;
  const missedCount = statsTasks.filter((t) => t.status === "missed").length;
  const settledCount = doneCount + missedCount;
  const completionRate = settledCount > 0 ? Math.round((doneCount / settledCount) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{profile.name}</h1>
            <StreakBadge currentStreak={profile.currentStreak} />
          </div>
          <p className="text-sm text-zinc-500">{profile.role === "parent" ? "Rodič" : "Dítě"}</p>
        </div>
      </div>

      <XPBar xpBalance={profile.xpBalance} levelTitles={family?.levelTitles} levelThresholds={family?.levelThresholds} />

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Odznaky</h2>
        {unlockedAchievements.length === 0 ? (
          <p className="text-sm text-zinc-500">Zatím žádné odznaky — první přijde brzy!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unlockedAchievements.map((a) => (
              <div
                key={a.key}
                title={a.description}
                className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent"
              >
                <span>{a.icon}</span>
                {a.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Statistiky (posledních {STATS_DAYS} dní)</h2>
        <div className="flex items-end gap-1 rounded-xl border border-border px-4 py-3">
          {days.map((day, i) => {
            const xp = dailyXp[i];
            const heightPct = xp === 0 ? 2 : Math.max(6, Math.round((Math.abs(xp) / maxDailyXp) * 100));
            return (
              <div key={day} className="flex flex-1 flex-col items-center gap-1" title={`${day}: ${xp >= 0 ? "+" : ""}${formatXp(xp)} XP`}>
                <div className="flex h-20 w-full items-end">
                  <div
                    className={`w-full rounded-t-sm ${xp < 0 ? "bg-danger" : "bg-accent"}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-500">{day.slice(8)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-zinc-500">
          {completionRate === null
            ? "Zatím žádné vyhodnocené úkoly v tomto období."
            : `Splněnost úkolů: ${completionRate} % (${doneCount} splněno, ${missedCount} propásnuto).`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Historie XP</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-zinc-500">Zatím žádná aktivita.</p>
        ) : (
          ledger.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{REASON_LABELS[entry.reason] ?? entry.reason}</p>
                {entry.note && <p className="truncate text-sm text-zinc-500">{entry.note}</p>}
                <p className="text-xs text-zinc-500">
                  {new Date(entry.timestamp).toLocaleString("cs-CZ")}
                </p>
              </div>
              <span className={`font-semibold ${entry.delta >= 0 ? "text-success" : "text-danger"}`}>
                {entry.delta >= 0 ? "+" : ""}
                {formatXp(entry.delta)} XP
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
