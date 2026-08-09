"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";

const DEFAULT_START_HOUR = 22;
const DEFAULT_END_HOUR = 6;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

export default function CurfewSettingsPanel({
  familyId,
  childCurfewEnabled,
  childCurfewStartHour,
  childCurfewEndHour,
}: {
  familyId: string;
  childCurfewEnabled?: boolean;
  childCurfewStartHour?: number;
  childCurfewEndHour?: number;
}) {
  const toast = useToast();
  const [startHour, setStartHour] = useState(childCurfewStartHour ?? DEFAULT_START_HOUR);
  const [endHour, setEndHour] = useState(childCurfewEndHour ?? DEFAULT_END_HOUR);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { childCurfewEnabled: !childCurfewEnabled });
    } catch {
      toast.error("Nepodařilo se změnit nastavení.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHours() {
    if (startHour === endHour) {
      toast.error("Začátek a konec nemůžou být stejné.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        childCurfewStartHour: startHour,
        childCurfewEndHour: endHour,
      });
      toast.success("Uloženo.");
    } catch {
      toast.error("Nepodařilo se uložit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Když je zapnuto, děti v tomto čase nemůžou aplikaci vůbec používat — uvidí jen zprávu, že mají jít spát.
        Rodičů se to netýká.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={childCurfewEnabled === true} disabled={saving} onChange={handleToggle} />
        Zablokovat aplikaci dětem v noci
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={startHour}
          onChange={(e) => setStartHour(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">až</span>
        <select
          value={endHour}
          onChange={(e) => setEndHour(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        >
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSaveHours}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          Uložit
        </button>
      </div>
    </div>
  );
}
