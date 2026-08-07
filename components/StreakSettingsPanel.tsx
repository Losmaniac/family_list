"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_STREAK_BONUS_CAP, DEFAULT_STREAK_BONUS_PER_DAY } from "@/lib/xp-engine";

export default function StreakSettingsPanel({
  familyId,
  streakBonusPerDay,
  streakBonusCap,
  streakFreezeEnabled,
}: {
  familyId: string;
  streakBonusPerDay?: number;
  streakBonusCap?: number;
  streakFreezeEnabled?: boolean;
}) {
  const toast = useToast();
  const [perDayPercent, setPerDayPercent] = useState(
    String(Math.round((streakBonusPerDay ?? DEFAULT_STREAK_BONUS_PER_DAY) * 1000) / 10)
  );
  const [capPercent, setCapPercent] = useState(
    String(Math.round((streakBonusCap ?? DEFAULT_STREAK_BONUS_CAP) * 1000) / 10)
  );
  const [savingStreak, setSavingStreak] = useState(false);
  const [savingFreezeToggle, setSavingFreezeToggle] = useState(false);

  async function handleSaveStreak() {
    const perDay = Number(perDayPercent);
    const cap = Number(capPercent);
    if (!Number.isFinite(perDay) || perDay < 0 || perDay > 100) {
      toast.error("Bonus za den musí být 0–100 %.");
      return;
    }
    if (!Number.isFinite(cap) || cap < 0 || cap > 500) {
      toast.error("Strop bonusu musí být 0–500 %.");
      return;
    }
    setSavingStreak(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        streakBonusPerDay: perDay / 100,
        streakBonusCap: cap / 100,
      });
      toast.success("Streak bonus uložen.");
    } catch {
      toast.error("Nepodařilo se uložit streak bonus.");
    } finally {
      setSavingStreak(false);
    }
  }

  async function handleResetStreak() {
    setSavingStreak(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        streakBonusPerDay: deleteField(),
        streakBonusCap: deleteField(),
      });
      setPerDayPercent(String(DEFAULT_STREAK_BONUS_PER_DAY * 100));
      setCapPercent(String(DEFAULT_STREAK_BONUS_CAP * 100));
      toast.success("Streak bonus obnoven na výchozí.");
    } catch {
      toast.error("Nepodařilo se obnovit výchozí hodnoty.");
    } finally {
      setSavingStreak(false);
    }
  }

  async function handleToggleFreeze() {
    setSavingFreezeToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        streakFreezeEnabled: streakFreezeEnabled === false,
      });
    } catch {
      toast.error("Nepodařilo se změnit nastavení odpuštěného dne.");
    } finally {
      setSavingFreezeToggle(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Streak = po sobě jdoucí dny, kdy má člen splněné úplně všechny své denní úkoly (jeden hotový úkol z
        více nestačí). Bonus se přičítá k XP za úkol, ne k celkovému zůstatku.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={streakFreezeEnabled !== false}
          disabled={savingFreezeToggle}
          onChange={handleToggleFreeze}
        />
        Odpustit jeden vynechaný den v týdnu (streak se nezruší); déle vynechané dny streak vynulují
      </label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-500" htmlFor="perDay">
            Bonus za den
          </label>
          <input
            id="perDay"
            type="number"
            min={0}
            max={100}
            value={perDayPercent}
            onChange={(e) => setPerDayPercent(e.target.value)}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-zinc-500">%</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-500" htmlFor="cap">
            Strop bonusu
          </label>
          <input
            id="cap"
            type="number"
            min={0}
            max={500}
            value={capPercent}
            onChange={(e) => setCapPercent(e.target.value)}
            className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-zinc-500">%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveStreak}
            disabled={savingStreak}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit
          </button>
          <button
            type="button"
            onClick={handleResetStreak}
            disabled={savingStreak}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Obnovit výchozí
          </button>
        </div>
      </div>
    </div>
  );
}
