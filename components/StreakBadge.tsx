interface StreakBadgeProps {
  currentStreak: number;
}

export default function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
      🔥 {currentStreak}
    </span>
  );
}
