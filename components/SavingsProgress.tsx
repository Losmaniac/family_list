import { PiggyBank, X } from "lucide-react";
import { formatXp } from "@/lib/xp-engine";
import type { Reward } from "@/lib/types";

function ProgressRow({ reward, xpBalance }: { reward: Reward; xpBalance: number }) {
  const progress = Math.min(100, Math.round((xpBalance / reward.xpCost) * 100));
  const remaining = Math.max(0, reward.xpCost - xpBalance);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">{reward.title}</p>
        <p className="text-zinc-500">{remaining === 0 ? "Můžeš uplatnit!" : `ještě ${formatXp(remaining)} XP`}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

interface SavingsProgressProps {
  rewards: Reward[];
  xpBalance: number;
  /** The member's explicitly chosen savings goal (starred on a reward card), if any. */
  goalReward?: Reward;
  onClearGoal?: () => void;
}

/** Progress toward a member's chosen savings goal — or, if they haven't picked one yet, a read-only "what am I closest to affording" fallback view. */
export default function SavingsProgress({ rewards, xpBalance, goalReward, onClearGoal }: SavingsProgressProps) {
  if (goalReward) {
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-medium">
            <PiggyBank size={18} className="text-accent" />
            Šetřím na
          </h2>
          {onClearGoal && (
            <button
              type="button"
              onClick={onClearGoal}
              className="flex items-center gap-1 text-sm text-zinc-500"
            >
              <X size={14} /> Zrušit cíl
            </button>
          )}
        </div>
        <ProgressRow reward={goalReward} xpBalance={xpBalance} />
      </section>
    );
  }

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
      <p className="text-xs text-zinc-500">Klikni na hvězdičku u odměny níže a označ si svůj cíl.</p>
      <div className="flex flex-col gap-2">
        {notYetAffordable.map((reward) => (
          <ProgressRow key={reward.id} reward={reward} xpBalance={xpBalance} />
        ))}
      </div>
    </section>
  );
}
