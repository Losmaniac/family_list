"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatXp } from "@/lib/xp-engine";
import { formatDurationMinutes } from "@/lib/adhoc-tasks";
import type { AdHocTaskType } from "@/lib/types";

type CooldownUnit = "minutes" | "hours";

function emptyForm() {
  return { title: "", xpValue: 10, cooldownValue: 2, cooldownUnit: "hours" as CooldownUnit, photoRequired: false };
}

export default function AdHocTaskSettingsPanel({ familyId }: { familyId: string }) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [types, setTypes] = useState<AdHocTaskType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "adHocTaskTypes"), (snapshot) => {
      setTypes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AdHocTaskType));
    });
  }, [familyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || form.xpValue <= 0 || form.cooldownValue < 0) return;
    setSubmitting(true);
    try {
      const cooldownMinutes = form.cooldownUnit === "hours" ? form.cooldownValue * 60 : form.cooldownValue;
      await addDoc(collection(getDb(), "families", familyId, "adHocTaskTypes"), {
        title: form.title.trim(),
        xpValue: form.xpValue,
        cooldownMinutes,
        active: true,
        photoRequired: form.photoRequired,
      });
      toast.success("Jednorázový úkol byl přidán.");
      setForm(emptyForm());
      setShowForm(false);
    } catch {
      toast.error("Úkol se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(type: AdHocTaskType) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "adHocTaskTypes", type.id), { active: !type.active });
    } catch {
      toast.error("Nepodařilo se změnit stav úkolu.");
    }
  }

  async function handleTogglePhotoRequired(type: AdHocTaskType) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "adHocTaskTypes", type.id), {
        photoRequired: !type.photoRequired,
      });
    } catch {
      toast.error("Nepodařilo se změnit stav úkolu.");
    }
  }

  async function handleDelete(type: AdHocTaskType) {
    const ok = await confirm({
      title: `Smazat „${type.title}“?`,
      description: "Tuto akci nelze vrátit zpět.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "adHocTaskTypes", type.id));
      toast.success("Úkol byl smazán.");
    } catch {
      toast.error("Úkol se nepodařilo smazat.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Nepravidelné úkoly (např. vyklizení myčky) — kdokoli je splní tlačítkem + na Dnešních úkolech, kdykoli je
        zrovna potřeba. Interval určuje, za jak dlouho je stejný úkol znovu dostupný — mezitím se počítá, že ještě
        nemohl být potřeba znovu.
      </p>
      {types.length === 0 ? (
        <p className="text-sm text-zinc-500">Zatím žádné jednorázové úkoly.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {types.map((type) => (
            <div key={type.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className={`font-medium ${!type.active ? "text-zinc-400 line-through" : ""}`}>{type.title}</p>
                <p className="text-sm text-zinc-500">
                  +{formatXp(type.xpValue)} XP · interval {formatDurationMinutes(type.cooldownMinutes)}
                  {type.photoRequired ? " · vyžaduje foto" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleTogglePhotoRequired(type)} className="text-sm text-accent">
                  {type.photoRequired ? "Foto: ano" : "Foto: ne"}
                </button>
                <button type="button" onClick={() => handleToggleActive(type)} className="text-sm text-accent">
                  {type.active ? "Deaktivovat" : "Aktivovat"}
                </button>
                <button type="button" onClick={() => handleDelete(type)} aria-label="Smazat" className="text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          + Přidat jednorázový úkol
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Např. Vyklidit myčku"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500">XP</label>
            <input
              type="number"
              min={1}
              value={form.xpValue}
              onChange={(e) => setForm((prev) => ({ ...prev, xpValue: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500">Interval mezi splněními</label>
            <input
              type="number"
              min={0}
              value={form.cooldownValue}
              onChange={(e) => setForm((prev) => ({ ...prev, cooldownValue: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2"
            />
            <select
              value={form.cooldownUnit}
              onChange={(e) => setForm((prev) => ({ ...prev, cooldownUnit: e.target.value as CooldownUnit }))}
              className="rounded-lg border border-border bg-surface px-3 py-2"
            >
              <option value="minutes">minut</option>
              <option value="hours">hodin</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={form.photoRequired}
              onChange={(e) => setForm((prev) => ({ ...prev, photoRequired: e.target.checked }))}
              className="h-4 w-4 accent-accent"
            />
            Vyžadovat foto při splnění
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Přidat
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
