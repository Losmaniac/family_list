import { Star } from "lucide-react";
import type { Reward } from "@/lib/types";
import { canAffordReward } from "@/lib/xp-engine";

interface RewardShopProps {
  rewards: Reward[];
  xpBalance: number;
  onRedeem?: (reward: Reward) => void;
  goalRewardId?: string;
  onToggleGoal?: (reward: Reward) => void;
}

export default function RewardShop({ rewards, xpBalance, onRedeem, goalRewardId, onToggleGoal }: RewardShopProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rewards
        .filter((reward) => reward.active)
        .map((reward) => {
          const affordable = canAffordReward(xpBalance, reward.xpCost);
          const isGoal = reward.id === goalRewardId;
          return (
            <div
              key={reward.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-4 ${
                isGoal ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
              }`}
            >
              <div className="flex min-w-0 items-start gap-1.5">
                {onToggleGoal && (
                  <button
                    type="button"
                    onClick={() => onToggleGoal(reward)}
                    aria-label={isGoal ? "Přestat šetřit na tuto odměnu" : "Šetřit na tuto odměnu"}
                    className="shrink-0 p-0.5 text-accent"
                  >
                    <Star size={18} fill={isGoal ? "currentColor" : "none"} />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="font-medium">{reward.title}</p>
                  <p className="text-sm text-zinc-500">{reward.xpCost.toLocaleString("cs-CZ")} XP</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => onRedeem?.(reward)}
                className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {reward.approvalRequired ? "Požádat" : "Uplatnit"}
              </button>
            </div>
          );
        })}
    </div>
  );
}
