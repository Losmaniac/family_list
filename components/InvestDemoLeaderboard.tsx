"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Trophy } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { CONTEST_XP_AWARDS, formatCzk, rankContestParticipants, roundMoney, type ContestParticipant } from "@/lib/invest-demo";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import type { InvestDemoContestResult, InvestDemoHolding, InvestDemoPortfolio, Member } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * "Kdo má nejlepší zhodnocení" — a family-wide ranking of every member's
 * demo-investing % return this month, plus the top-3 XP awards
 * (CONTEST_XP_AWARDS) once functions/src/investDemo.ts's
 * investDemoContestSettle actually decides it (last day of the month,
 * 20:00). Live standings here are a client-side preview using the same
 * getInvestDemoQuotes callable InvestDemoPanel uses for one's own
 * portfolio, just summed across every member — never authoritative, the
 * server always recomputes independently at settle time.
 */
export default function InvestDemoLeaderboard({ familyId }: { familyId: string }) {
  const [portfolios, setPortfolios] = useState<Record<string, InvestDemoPortfolio>>({});
  const [holdingsByUid, setHoldingsByUid] = useState<Record<string, InvestDemoHolding[]>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [quotesBySymbol, setQuotesBySymbol] = useState<Record<string, number | null>>({});
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

  // One holdings subscription per known portfolio uid — a family has few
  // enough members that this stays cheap, and avoids relying on
  // collectionGroup query semantics for something this small.
  const portfolioUids = useMemo(() => Object.keys(portfolios).sort().join(","), [portfolios]);
  useEffect(() => {
    const uids = portfolioUids ? portfolioUids.split(",") : [];
    const unsubs = uids.map((uid) =>
      onSnapshot(collection(getDb(), "families", familyId, "investDemoPortfolios", uid, "holdings"), (snap) => {
        setHoldingsByUid((prev) => ({ ...prev, [uid]: snap.docs.map((d) => d.data() as InvestDemoHolding) }));
      })
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [familyId, portfolioUids]);

  const symbolsKey = useMemo(() => {
    const set = new Set<string>();
    for (const holdings of Object.values(holdingsByUid)) for (const h of holdings) set.add(h.symbol);
    return [...set].sort().join(",");
  }, [holdingsByUid]);

  // Clear stale quotes the instant the symbol set actually changes (e.g.
  // every holding got sold off) — done during render, React's documented
  // pattern for "adjust state when a derived value changes", rather than a
  // synchronous setState at the top of the effect below.
  const [trackedSymbolsKey, setTrackedSymbolsKey] = useState(symbolsKey);
  if (trackedSymbolsKey !== symbolsKey) {
    setTrackedSymbolsKey(symbolsKey);
    if (symbolsKey === "") setQuotesBySymbol({});
  }

  useEffect(() => {
    if (!symbolsKey) return;
    const symbols = symbolsKey.split(",");
    let cancelled = false;
    httpsCallable<{ familyId: string; symbols: string[] }, { quotes: { symbol: string; priceCzk: number | null }[] }>(
      getFirebaseFunctions(),
      "getInvestDemoQuotes"
    )({ familyId, symbols })
      .then((result) => {
        if (cancelled) return;
        const next: Record<string, number | null> = {};
        for (const q of result.data.quotes) next[q.symbol] = q.priceCzk;
        setQuotesBySymbol(next);
      })
      .catch(() => {
        // Best-effort — a failed background price refresh just leaves the leaderboard on its last known values, no user-facing error needed.
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, symbolsKey]);

  const standings = useMemo(() => {
    const participants: ContestParticipant[] = Object.entries(portfolios).map(([uid, portfolio]) => {
      const holdings = holdingsByUid[uid] ?? [];
      const holdingsValueCzk = holdings.reduce((sum, h) => sum + (quotesBySymbol[h.symbol] ?? 0) * h.quantity, 0);
      return {
        userId: uid,
        totalValueCzk: roundMoney(portfolio.cashBalance + holdingsValueCzk),
        baselineCzk: portfolio.roundBaselineCzk ?? portfolio.cashBalance,
      };
    });
    return rankContestParticipants(participants);
  }, [portfolios, holdingsByUid, quotesBySymbol]);

  if (standings.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
          <Trophy size={16} /> Žebříček — aktuální kolo
        </h3>
        <div className="flex flex-col gap-1.5">
          {standings.map((standing, i) => {
            const member = members[standing.userId];
            return (
              <div key={standing.userId} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center text-lg">{MEDALS[i] ?? `${i + 1}.`}</span>
                  {member && <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />}
                  <span className="font-medium">{member?.name ?? standing.userId}</span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${standing.returnPct >= 0 ? "text-success" : "text-danger"}`}>
                    {standing.returnPct >= 0 ? "+" : ""}
                    {(standing.returnPct * 100).toFixed(1)} %
                  </p>
                  <p className="text-xs text-zinc-500">{formatCzk(standing.totalValueCzk)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-400">
          Poslední den v měsíci se vyhlásí vítězové: 1. místo {formatXp(CONTEST_XP_AWARDS[0])} XP, 2. místo{" "}
          {formatXp(CONTEST_XP_AWARDS[1])} XP, 3. místo {formatXp(CONTEST_XP_AWARDS[2])} XP.
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
                      {MEDALS[i]} {members[standing.userId]?.name ?? standing.userId} · {(standing.returnPct * 100).toFixed(1)} % · +
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
