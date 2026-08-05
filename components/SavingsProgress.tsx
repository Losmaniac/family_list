import { PiggyBank } from "lucide-react";
import type { Reward } from "@/lib/types";

interface SavingsProgressProps {
  rewards: Reward[];
  xpBalance: number;
}

/** Read-only "what am I closest to affording" view — no new writes or schema, just a different slice of the existing reward catalog + balance. */
export default function SavingsProgress({ rewards, xpBalance }: SavingsProgressProps) {
  const notYetAffordable = rewards
    .filter((r) => r.active && r.xpCost > xpBalance)
    .sort((a, b) => a.xpCost - b.xpCost)
    .slice(0, 3);

  if (notYetAffordable.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <PiggyBank size={18} className="text-accent" />
        Šetřím na
      </h2>
      <div className="flex flex-col gap-2">
        {notYetAffordable.map((reward) => {
          const progress = Math.min(100, Math.round((xpBalance / reward.xpCost) * 100));
          const remaining = reward.xpCost - xpBalance;
          return (
            <div key={reward.id} className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium">{reward.title}</p>
                <p className="text-zinc-500">ještě {remaining} XP</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
