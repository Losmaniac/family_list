"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_LEVEL_THRESHOLDS, DEFAULT_LEVEL_TITLES } from "@/lib/xp-engine";

export default function GameSettingsPanel({
  familyId,
  levelTitles,
  levelThresholds,
  taskRequestsEnabled,
  taskRequestMaxRemaining,
}: {
  familyId: string;
  levelTitles?: string[];
  levelThresholds?: number[];
  taskRequestsEnabled?: boolean;
  taskRequestMaxRemaining?: number;
}) {
  const toast = useToast();
  const [savingRequestsToggle, setSavingRequestsToggle] = useState(false);

  async function handleToggleRequestsEnabled() {
    setSavingRequestsToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { taskRequestsEnabled: !(taskRequestsEnabled !== false) });
    } catch {
      toast.error("Nepodařilo se změnit nastavení žádostí o úkoly.");
    } finally {
      setSavingRequestsToggle(false);
    }
  }

  const [maxRemainingInput, setMaxRemainingInput] = useState(
    taskRequestMaxRemaining !== undefined ? String(taskRequestMaxRemaining) : ""
  );
  const [savingMaxRemaining, setSavingMaxRemaining] = useState(false);

  async function handleSaveMaxRemaining() {
    const trimmed = maxRemainingInput.trim();
    setSavingMaxRemaining(true);
    try {
      if (trimmed === "") {
        await updateDoc(doc(getDb(), "families", familyId), { taskRequestMaxRemaining: deleteField() });
        toast.success("Limit vypnut — tlačítko je dostupné vždy, jakmile něco zbývá.");
      } else {
        const value = Number(trimmed);
        if (!Number.isInteger(value) || value < 0) {
          toast.error("Zadej celé číslo 0 nebo víc.");
          return;
        }
        await updateDoc(doc(getDb(), "families", familyId), { taskRequestMaxRemaining: value });
        toast.success("Limit uložen.");
      }
    } catch {
      toast.error("Nepodařilo se uložit limit.");
    } finally {
      setSavingMaxRemaining(false);
    }
  }

  const [titles, setTitles] = useState<string[]>(() => {
    const base = levelTitles && levelTitles.length > 0 ? levelTitles : DEFAULT_LEVEL_TITLES;
    return DEFAULT_LEVEL_TITLES.map((fallback, i) => base[i] ?? fallback);
  });
  const [savingTitles, setSavingTitles] = useState(false);

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

  const [thresholds, setThresholds] = useState<number[]>(() => {
    const base = levelThresholds && levelThresholds.length > 0 ? levelThresholds : DEFAULT_LEVEL_THRESHOLDS;
    return DEFAULT_LEVEL_THRESHOLDS.map((fallback, i) => base[i] ?? fallback);
  });
  const [savingThresholds, setSavingThresholds] = useState(false);

  function updateThreshold(index: number, value: string) {
    setThresholds((prev) => prev.map((t, i) => (i === index ? Number(value) : t)));
  }

  async function handleSaveThresholds() {
    // Level 1 always starts at 0 XP — not user-editable, enforced here too
    // in case a stale input somehow carried a nonzero value.
    const toSave = [0, ...thresholds.slice(1)];
    for (let i = 1; i < toSave.length; i++) {
      if (!Number.isFinite(toSave[i]) || toSave[i] <= toSave[i - 1]) {
        toast.error("Každý další level musí vyžadovat víc XP než ten předchozí.");
        return;
      }
    }
    setSavingThresholds(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { levelThresholds: toSave });
      setThresholds(toSave);
      toast.success("Potřebné XP pro levely uloženo.");
    } catch {
      toast.error("Nepodařilo se uložit potřebné XP.");
    } finally {
      setSavingThresholds(false);
    }
  }

  async function handleResetThresholds() {
    setSavingThresholds(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { levelThresholds: deleteField() });
      setThresholds(DEFAULT_LEVEL_THRESHOLDS);
      toast.success("Potřebné XP obnoveno na výchozí.");
    } catch {
      toast.error("Nepodařilo se obnovit výchozí hodnoty.");
    } finally {
      setSavingThresholds(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={taskRequestsEnabled !== false}
          disabled={savingRequestsToggle}
          onChange={handleToggleRequestsEnabled}
        />
        Povolit žádosti o nový úkol (člen rodiny si může vyžádat úkol, až nemá co dělat)
      </label>

      {taskRequestsEnabled !== false && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Kolik nesplněných úkolů smí členovi ještě zbývat, aby si mohl rovnou na kartě Dnes vyžádat další (vedle
            hlavního tlačítka, které se ukáže, až je seznam úplně prázdný). Nech prázdné pro bez omezení.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="bez omezení"
              value={maxRemainingInput}
              onChange={(e) => setMaxRemainingInput(e.target.value)}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleSaveMaxRemaining}
              disabled={savingMaxRemaining}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
            </button>
          </div>
        </div>
      )}

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

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500">
          Potřebné XP pro levely (2–10; level 1 vždy začíná na 0 XP). Nad level 10 se dál přičítá stejný krok jako
          mezi levely 9 a 10.
        </p>
        <div className="flex flex-col gap-1.5">
          {thresholds.map((threshold, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs text-zinc-500">{i + 1}.</span>
              <input
                type="number"
                min={0}
                value={threshold}
                disabled={i === 0}
                onChange={(e) => updateThreshold(i, e.target.value)}
                className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm disabled:opacity-50"
              />
              <span className="text-xs text-zinc-500">XP</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveThresholds}
            disabled={savingThresholds}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit XP
          </button>
          <button
            type="button"
            onClick={handleResetThresholds}
            disabled={savingThresholds}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Obnovit výchozí
          </button>
        </div>
      </div>
    </div>
  );
}
