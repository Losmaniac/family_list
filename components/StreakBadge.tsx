import { Flame } from "lucide-react";
import { streakBonusFraction } from "@/lib/xp-engine";

interface StreakBadgeProps {
  currentStreak: number;
  streakBonusPerDay?: number;
  streakBonusCap?: number;
}

export default function StreakBadge({ currentStreak, streakBonusPerDay, streakBonusCap }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  const bonus = streakBonusFraction(currentStreak, streakBonusPerDay, streakBonusCap);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
      <Flame size={14} className="fill-current" />
      {currentStreak}
      {bonus > 0 && <span className="font-normal opacity-80">· +{Math.round(bonus * 100)} % XP</span>}
    </span>
  );
}
