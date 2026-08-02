interface XPBarProps {
  xpBalance: number;
  xpForNextLevel: number;
}

export default function XPBar({ xpBalance, xpForNextLevel }: XPBarProps) {
  const progress = Math.min(100, Math.round((xpBalance / xpForNextLevel) * 100));

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm text-zinc-500">
        <span>{xpBalance.toLocaleString("cs-CZ")} XP</span>
        <span>{xpForNextLevel.toLocaleString("cs-CZ")} XP</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
