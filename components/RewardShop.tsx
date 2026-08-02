import type { Reward } from "@/lib/types";
import { canAffordReward } from "@/lib/xp-engine";

interface RewardShopProps {
  rewards: Reward[];
  xpBalance: number;
  onRedeem?: (reward: Reward) => void;
}

export default function RewardShop({ rewards, xpBalance, onRedeem }: RewardShopProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rewards
        .filter((reward) => reward.active)
        .map((reward) => {
          const affordable = canAffordReward(xpBalance, reward.xpCost);
          return (
            <div
              key={reward.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-medium">{reward.title}</p>
                <p className="text-sm text-zinc-500">{reward.xpCost.toLocaleString("cs-CZ")} XP</p>
              </div>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => onRedeem?.(reward)}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              >
                {reward.approvalRequired ? "Požádat" : "Uplatnit"}
              </button>
            </div>
          );
        })}
    </div>
  );
}
