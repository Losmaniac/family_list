"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_LEVEL_TITLES } from "@/lib/xp-engine";

export default function GameSettingsPanel({
  familyId,
  levelTitles,
  taskRequestsEnabled,
}: {
  familyId: string;
  levelTitles?: string[];
  taskRequestsEnabled?: boolean;
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
