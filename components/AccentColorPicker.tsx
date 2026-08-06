"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { Check } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";

const PRESET_COLORS = [
  { label: "Výchozí (jantarová)", value: undefined },
  { label: "Růžová", value: "#ec4899" },
  { label: "Červená", value: "#ef4444" },
  { label: "Oranžová", value: "#f97316" },
  { label: "Zelená", value: "#22c55e" },
  { label: "Tyrkysová", value: "#06b6d4" },
  { label: "Modrá", value: "#3b82f6" },
  { label: "Fialová", value: "#8b5cf6" },
];

export default function AccentColorPicker({ familyId, currentColor }: { familyId: string; currentColor?: string }) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | undefined>(undefined);

  async function handlePick(color: string | undefined) {
    setSaving(color ?? "default");
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        accentColor: color ?? deleteField(),
      });
    } catch {
      toast.error("Barvu se nepodařilo uložit.");
    } finally {
      setSaving(undefined);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((preset) => {
        const isActive = preset.value === currentColor || (!preset.value && !currentColor);
        return (
          <button
            key={preset.label}
            type="button"
            title={preset.label}
            aria-label={preset.label}
            onClick={() => handlePick(preset.value)}
            disabled={saving !== undefined}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 disabled:opacity-60"
            style={{
              backgroundColor: preset.value ?? "#f59e0b",
              borderColor: isActive ? "var(--foreground)" : "transparent",
            }}
          >
            {isActive && <Check size={16} className="text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}
