"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Trophy } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { formatCzk, rankContestParticipants, type ContestParticipant } from "@/lib/invest-demo";
import { formatXp } from "@/lib/xp-engine";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import Avatar from "@/components/Avatar";
import type { InvestDemoContestResult, InvestDemoPortfolio, Member } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * "Kdo má nejvíc" — a family-wide ranking of every member's demo-investing
 * account balance this month (cash + open positions at live prices), plus
 * what each rank is currently worth in XP (CONTEST_XP_AWARDS, via
 * rankContestParticipants — the exact same function
 * functions/src/investDemo.ts's investDemoContestSettle uses to actually
 * decide the payout on the last day of the month). Standings here read each
 * portfolio's totalValueCzk directly — a value investDemoValuationRefresh
 * recomputes 4x/day (00:00/06:00/12:00/18:00), not fetched live on every
 * page view — so this is always at most ~6h stale, never authoritative for
 * the real payout either way. On settlement, open positions are
 * automatically sold to cash before ranking (see liquidatePortfolio), so
 * the final number is always realized, not an estimate. A top-3 rank whose
 * balance didn't actually grow past where it started the round still shows
 * 0 XP here, matching the real payout rule.
 */
export default function InvestDemoLeaderboard({ familyId }: { familyId: string }) {
  const [portfolios, setPortfolios] = useState<Record<string, InvestDemoPortfolio>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [results, setResults] = useState<InvestDemoContestResult[]>([]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "investDemoPortfolios"), (snap) => {
      const next: Record<string, InvestDemoPortfolio> = {};
      for (const d of snap.docs) next[d.id] = d.data() as InvestDemoPortfolio;
      setPortfolios(next);
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snap) => {
      const next: Record<string, Member> = {};
      for (const d of snap.docs) next[d.id] = { id: d.id, ...d.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  useEffect(() => {
    const resultsQuery = query(collection(getDb(), "families", familyId, "investDemoContestResults"), orderBy("settledAt", "desc"));
    return onSnapshot(resultsQuery, (snap) => {
      setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InvestDemoContestResult));
    });
  }, [familyId]);

  const standings = useMemo(() => {
    const participants: ContestParticipant[] = Object.entries(portfolios).map(([uid, portfolio]) => ({
      userId: uid,
      totalValueCzk: portfolio.totalValueCzk ?? portfolio.cashBalance,
      roundStartCzk: portfolio.roundStartCzk ?? portfolio.cashBalance,
    }));
    return rankContestParticipants(participants);
  }, [portfolios]);

  const latestValuedAt = useMemo(() => {
    const timestamps = Object.values(portfolios)
      .map((p) => p.valuedAt)
      .filter((t): t is number => typeof t === "number");
    return timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  }, [portfolios]);

  if (standings.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
            <Trophy size={16} /> Žebříček — aktuální kolo
          </h3>
          {latestValuedAt && (
            <span className="text-xs text-zinc-400">Aktualizováno {formatDateTimeInFamilyZone(new Date(latestValuedAt))}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {standings.map((standing, i) => {
            const member = members[standing.userId];
            return (
              <div key={standing.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center text-lg">{MEDALS[i] ?? `${i + 1}.`}</span>
                  {member && <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />}
                  <span className="font-medium">{member?.name ?? standing.userId}</span>
                  {standing.xpAwarded > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                      +{formatXp(standing.xpAwarded)} XP
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCzk(standing.totalValueCzk)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-400">
          Odměna vedle jména je, co by dané místo vyhrálo, kdyby kolo končilo právě teď — vyhlašuje a vyplácí se ale
          až poslední den v měsíci ve 20:00, kdy se všechny otevřené pozice automaticky prodají za hotovost a
          rozhoduje celkový zůstatek. Odměnu ale dostane jen ten, jehož zůstatek je vyšší než na začátku kola — i
          první místo je bez odměny, pokud přes měsíc jen prodělalo méně než ostatní.
        </p>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">Historie soutěže</h3>
          {results.map((result) => (
            <div key={result.id} className="rounded-xl border border-border px-4 py-2.5">
              <p className="text-sm font-medium">{result.id}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {result.standings
                  .filter((standing) => standing.xpAwarded > 0)
                  .map((standing, i) => (
                    <p key={standing.userId} className="text-xs text-zinc-500">
                      {MEDALS[i]} {members[standing.userId]?.name ?? standing.userId} · {formatCzk(standing.totalValueCzk)} · +
                      {formatXp(standing.xpAwarded)} XP
                    </p>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
