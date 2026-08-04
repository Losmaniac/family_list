import { Flame } from "lucide-react";

interface StreakBadgeProps {
  currentStreak: number;
}

export default function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
      <Flame size={14} className="fill-current" />
      {currentStreak}
    </span>
  );
}
