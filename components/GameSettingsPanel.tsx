"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_LEVEL_TITLES, DEFAULT_STREAK_BONUS_CAP, DEFAULT_STREAK_BONUS_PER_DAY } from "@/lib/xp-engine";

export default function GameSettingsPanel({
  familyId,
  streakBonusPerDay,
  streakBonusCap,
  levelTitles,
}: {
  familyId: string;
  streakBonusPerDay?: number;
  streakBonusCap?: number;
  levelTitles?: string[];
}) {
  const toast = useToast();
  const [perDayPercent, setPerDayPercent] = useState(String(Math.round((streakBonusPerDay ?? DEFAULT_STREAK_BONUS_PER_DAY) * 1000) / 10));
  const [capPercent, setCapPercent] = useState(String(Math.round((streakBonusCap ?? DEFAULT_STREAK_BONUS_CAP) * 1000) / 10));
  const [titles, setTitles] = useState<string[]>(() => {
    const base = levelTitles && levelTitles.length > 0 ? levelTitles : DEFAULT_LEVEL_TITLES;
    return DEFAULT_LEVEL_TITLES.map((fallback, i) => base[i] ?? fallback);
  });
  const [savingStreak, setSavingStreak] = useState(false);
  const [savingTitles, setSavingTitles] = useState(false);

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

  function updateTitle(index: number, value: string) {
    setTitles((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  async function handleSaveTitles() {
    if (titles.some((t) => !t.trim())) {
      toast.error("Žádný název levelu nemůže být prázdný.");
      return;
    }
    setSavingTitles(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { levelTitles: titles.map((t) => t.trim()) });
      toast.success("Názvy levelů uloženy.");
    } catch {
      toast.error("Nepodařilo se uložit názvy levelů.");
    } finally {
      setSavingTitles(false);
    }
  }

  async function handleResetTitles() {
    setSavingTitles(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { levelTitles: deleteField() });
      setTitles(DEFAULT_LEVEL_TITLES);
      toast.success("Názvy levelů obnoveny na výchozí.");
    } catch {
      toast.error("Nepodařilo se obnovit výchozí názvy.");
    } finally {
      setSavingTitles(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">
          Streak = po sobě jdoucí dny, kdy má člen alespoň jeden schválený úkol. Jeden vynechaný den v týdnu se
          odpouští (streak se nezruší), déle vynechané dny streak vynulují. Bonus se přičítá k XP za úkol, ne k
          celkovému zůstatku.
        </p>
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

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">Názvy levelů (1–10; nad 10 se opakuje poslední název)</p>
        <div className="flex flex-col gap-1.5">
          {titles.map((title, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs text-zinc-500">{i + 1}.</span>
              <input
                type="text"
                value={title}
                onChange={(e) => updateTitle(i, e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveTitles}
            disabled={savingTitles}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit názvy
          </button>
          <button
            type="button"
            onClick={handleResetTitles}
            disabled={savingTitles}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Obnovit výchozí
          </button>
        </div>
      </div>
    </div>
  );
}
