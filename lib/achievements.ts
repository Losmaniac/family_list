export interface Achievement {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export interface AchievementProgress extends Achievement {
  unlocked: boolean;
}

const STREAK_MILESTONES: [number, string, string][] = [
  [7, "🔥", "7 dní v řadě"],
  [30, "🔥", "30 dní v řadě"],
  [100, "🔥", "100 dní v řadě"],
];

const TASK_COUNT_MILESTONES: [number, string, string][] = [
  [10, "✅", "10 splněných úkolů"],
  [50, "✅", "50 splněných úkolů"],
  [100, "✅", "100 splněných úkolů"],
  [250, "✅", "250 splněných úkolů"],
];

/** Badges are permanent once unlocked — streak ones key off longestStreak, not the live streak that can reset. */
export function computeAchievements(longestStreak: number, completedTaskCount: number): AchievementProgress[] {
  const streakBadges = STREAK_MILESTONES.map(([threshold, icon, label]) => ({
    key: `streak-${threshold}`,
    icon,
    label,
    description: `Udrž si sérii ${threshold} dní v řadě.`,
    unlocked: longestStreak >= threshold,
  }));

  const taskBadges = TASK_COUNT_MILESTONES.map(([threshold, icon, label]) => ({
    key: `tasks-${threshold}`,
    icon,
    label,
    description: `Splň celkem ${threshold} úkolů.`,
    unlocked: completedTaskCount >= threshold,
  }));

  return [...streakBadges, ...taskBadges];
}
