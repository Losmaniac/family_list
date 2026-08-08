import { Trophy } from "lucide-react";
import { earliestTimestampAtBalance, formatXp, levelProgress } from "@/lib/xp-engine";
import { totalInvested } from "@/lib/investments";
import Avatar from "@/components/Avatar";
import InfoButton from "@/components/InfoButton";
import type { Investment, Member, XpLedgerEntry } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉", "🥔"];

interface LeaderboardProps {
  members: Member[];
  levelTitles?: string[];
  levelThresholds?: number[];
  /** Full xpLedger history — used only to break ties (see below); leaderboard order still works fine without it, just without the tie-break. */
  ledgerEntries?: Pick<XpLedgerEntry, "userId" | "delta" | "timestamp">[];
  /** Every family member's investments — used only to show how much of a member's XP is currently locked away, alongside their real (spendable) balance the ranking is actually based on. */
  investments?: Pick<Investment, "userId" | "principal" | "status">[];
}

export default function Leaderboard({
  members,
  levelTitles,
  levelThresholds,
  ledgerEntries = [],
  investments = [],
}: LeaderboardProps) {
  // Same XP → whoever reached that exact total first ranks higher (a tie
  // that stays a tie forever otherwise feels arbitrary/unfair to kids
  // watching the leaderboard). Falls back to Infinity — sorts last among
  // ties — when we can't determine it, e.g. ledgerEntries wasn't passed or
  // is a truncated slice that never actually sums to the balance.
  const achievedAt = new Map<string, number>();
  for (const member of members) {
    const userEntries = ledgerEntries.filter((e) => e.userId === member.id);
    const at = earliestTimestampAtBalance(userEntries, member.xpBalance);
    if (at !== undefined) achievedAt.set(member.id, at);
  }

  const ranked = [...members].sort((a, b) => {
    if (b.xpBalance !== a.xpBalance) return b.xpBalance - a.xpBalance;
    return (achievedAt.get(a.id) ?? Infinity) - (achievedAt.get(b.id) ?? Infinity);
  });
  if (ranked.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <Trophy size={18} className="text-accent" />
        Žebříček
        <InfoButton
          title="Žebříček"
          description="Pořadí členů rodiny podle reálného (dostupného) XP — kdo splní víc úkolů a udrží streak, stoupá výš. V závorce je vidět, kolik má kdo aktuálně zainvestováno (to se do pořadí nepočítá, dokud se investice nevyplatí). Aktualizuje se hned, jak někomu přibude XP."
        />
      </h2>
      <div className="flex flex-col gap-1.5">
        {ranked.map((member, i) => {
          const { title } = levelProgress(member.xpBalance, levelTitles, levelThresholds);
          const invested = totalInvested(investments, member.id);
          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                i === 0 ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-zinc-400">
                {MEDALS[i] ?? i + 1}
              </span>
              <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.name}</p>
                <p className="text-xs text-zinc-500">{title}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-sm font-semibold text-accent">{formatXp(member.xpBalance)} XP</span>
                {invested > 0 && (
                  <span className="text-[10px] text-zinc-400">(zainvestováno {formatXp(invested)})</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
