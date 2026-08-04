import { levelForXp, xpIntoCurrentLevel, xpPerLevel } from "@/lib/xp-engine";

interface XPBarProps {
  xpBalance: number;
}

export default function XPBar({ xpBalance }: XPBarProps) {
  const level = levelForXp(xpBalance);
  const intoLevel = xpIntoCurrentLevel(xpBalance);
  const perLevel = xpPerLevel();
  const progress = Math.round((intoLevel / perLevel) * 100);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold">Level {level}</span>
        <span className="text-zinc-500">
          {intoLevel}/{perLevel} XP
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
