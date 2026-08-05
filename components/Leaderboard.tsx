import { Trophy } from "lucide-react";
import { levelProgress } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import type { Member } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

interface LeaderboardProps {
  members: Member[];
}

export default function Leaderboard({ members }: LeaderboardProps) {
  const ranked = [...members].sort((a, b) => b.xpBalance - a.xpBalance);
  if (ranked.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <Trophy size={18} className="text-accent" />
        Žebříček
      </h2>
      <div className="flex flex-col gap-1.5">
        {ranked.map((member, i) => {
          const { title } = levelProgress(member.xpBalance);
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
              <span className="shrink-0 text-sm font-semibold text-accent">
                {member.xpBalance.toLocaleString("cs-CZ")} XP
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
