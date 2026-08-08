"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { logAction } from "@/lib/audit-log";
import { TASK_PRESET_CATEGORIES, type TaskPreset } from "@/lib/task-presets";
import { TASK_CATEGORIES, categoryInfo } from "@/lib/categories";
import { dateKeyInFamilyZone } from "@/lib/date-utils";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import WeekSchedule from "@/components/WeekSchedule";
import type { Member, Recurrence, TaskCategory, TaskTemplate } from "@/lib/types";

const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function todayKey(): string {
  return dateKeyInFamilyZone(new Date());
}

function emptyForm() {
  return {
    title: "",
    description: "",
    category: "household" as TaskCategory,
    xpValue: 10,
    recurrence: "daily" as Recurrence,
    daysOfWeek: [] as number[],
    date: todayKey(),
    dayOfMonth: 1,
    assignedTo: [] as string[],
    photoRequired: false,
  };
}

export default function AssignPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [quickAddSchedule, setQuickAddSchedule] = useState<"daily" | "weekdays" | "weekend">("daily");

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "taskTemplates"), (snapshot) => {
      setTemplates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskTemplate));
    });
  }, [familyId]);

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  }

  function toggleAssignee(userId: string) {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter((id) => id !== userId)
        : [...prev.assignedTo, userId],
    }));
  }

  function startEdit(template: TaskTemplate) {
    setEditingId(template.id);
    setForm({
      title: template.title,
      description: template.description ?? "",
      category: template.category ?? "household",
      xpValue: template.xpValue,
      recurrence: template.recurrence,
      daysOfWeek: template.daysOfWeek,
      date: template.date ?? todayKey(),
      dayOfMonth: template.dayOfMonth ?? 1,
      assignedTo: template.assignedTo,
      photoRequired: template.photoRequired ?? false,
    });
    setShowForm(true);
  }

  function applyPreset(preset: TaskPreset) {
    // Only "Denní" presets (recurrence: daily) are affected by the
    // pracovní dny/víkend toggle — weekly/once presets already carry
    // their own fixed days and shouldn't be reinterpreted.
    const useCustomDays = preset.recurrence === "daily" && quickAddSchedule !== "daily";
    setForm((prev) => ({
      ...prev,
      title: preset.title,
      category: preset.category,
      xpValue: preset.xpValue,
      recurrence: useCustomDays ? "custom" : preset.recurrence,
      daysOfWeek: useCustomDays ? (quickAddSchedule === "weekdays" ? [1, 2, 3, 4, 5] : [6, 0]) : preset.daysOfWeek,
    }));
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || form.assignedTo.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        category: form.category,
        xpValue: form.xpValue,
        recurrence: form.recurrence,
        assignedTo: form.assignedTo,
        daysOfWeek: form.recurrence === "weekly" || form.recurrence === "custom" ? form.daysOfWeek : [],
        date: form.recurrence === "once" ? form.date : null,
        dayOfMonth: form.recurrence === "monthly" ? form.dayOfMonth : null,
        active: true,
        photoRequired: form.photoRequired,
      };

      if (editingId) {
        await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", editingId), payload);
        toast.success("Úkol byl upraven.");
      } else {
        await addDoc(collection(getDb(), "families", familyId, "taskTemplates"), payload);
        toast.success("Úkol byl přidán.");
      }
      cancelEdit();
    } catch {
      toast.error("Úkol se nepodařilo uložit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(template: TaskTemplate) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id), {
        active: !template.active,
      });
    } catch {
      toast.error("Nepodařilo se změnit stav úkolu.");
    }
  }

  async function removeTemplate(template: TaskTemplate) {
    if (!familyId) return;
    const ok = await confirm({
      title: `Smazat úkol „${template.title}“?`,
      description: "Tuto akci nelze vrátit zpět.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id));
      if (user) logAction(familyId, user.uid, "task_template_deleted", template.title);
      toast.success("Úkol byl smazán.");
      if (editingId === template.id) cancelEdit();
    } catch {
      toast.error("Úkol se nepodařilo smazat.");
    }
  }

  async function handleReassignDay(template: TaskTemplate, fromDay: number, toDay: number) {
    if (!familyId) return;
    const nextDays = Array.from(new Set([...template.daysOfWeek.filter((d) => d !== fromDay), toDay]));
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id), {
        daysOfWeek: nextDays,
      });
    } catch {
      toast.error("Den se nepodařilo změnit.");
    }
  }

  function recurrenceLabel(template: TaskTemplate): string {
    if (template.recurrence === "once") return template.date ?? "jednorázově";
    if (template.recurrence === "daily") return "denně";
    if (template.recurrence === "monthly") return `měsíčně (${template.dayOfMonth ?? "?"}. den)`;
    if (template.daysOfWeek.length === 0) return "vybrané dny";
    return template.daysOfWeek.map((d) => WEEKDAYS[d]).join(", ");
  }

  if (member?.role !== "parent") {
    return <p className="text-zinc-500">Dostupné pouze pro rodiče.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Zadávání úkolů</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            + Nový úkol
          </button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Tento týden</h2>
        <WeekSchedule templates={templates} members={members} onReassignDay={handleReassignDay} />
      </section>

      {!showForm && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Rychlé přidání</h2>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-zinc-500">Pro denní úkoly platí od</p>
            <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
              {(
                [
                  { value: "daily", label: "Denně" },
                  { value: "weekdays", label: "Pracovní dny" },
                  { value: "weekend", label: "Víkend" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQuickAddSchedule(opt.value)}
                  className={`rounded-full px-3 py-1 ${
                    quickAddSchedule === opt.value ? "bg-accent text-accent-foreground" : "text-zinc-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {TASK_PRESET_CATEGORIES.map((presetGroup) => (
            <div key={presetGroup.label} className="flex flex-col gap-1.5">
              <p className="text-sm text-zinc-500">{presetGroup.label}</p>
              <div className="flex flex-wrap gap-2">
                {presetGroup.presets.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
                  >
                    <span>{preset.icon}</span>
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          {editingId && (
            <p className="text-sm text-accent">Upravuješ úkol.</p>
          )}

          <input
            type="text"
            placeholder="Název úkolu"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />

          <textarea
            placeholder="Popis (nepovinné)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />

          <div className="flex flex-wrap gap-2">
            {TASK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, category: cat.value }))}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                  form.category === cat.value ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-500" htmlFor="xpValue">
              XP za splnění
            </label>
            <input
              id="xpValue"
              type="number"
              min={1}
              value={form.xpValue}
              onChange={(e) => setForm((prev) => ({ ...prev, xpValue: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-border bg-surface px-4 py-2"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.photoRequired}
              onChange={(e) => setForm((prev) => ({ ...prev, photoRequired: e.target.checked }))}
            />
            Vyžaduje foto při splnění
          </label>

          <select
            value={form.recurrence}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence: e.target.value as Recurrence }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          >
            <option value="once">Jednorázově</option>
            <option value="daily">Denně</option>
            <option value="weekly">Týdně (vybrané dny)</option>
            <option value="monthly">Měsíčně</option>
            <option value="custom">Vlastní dny</option>
          </select>

          {form.recurrence === "once" && (
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="rounded-lg border border-border bg-surface px-4 py-2"
            />
          )}

          {form.recurrence === "monthly" && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500" htmlFor="dayOfMonth">
                Den v měsíci
              </label>
              <input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={(e) => setForm((prev) => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                className="w-20 rounded-lg border border-border bg-surface px-4 py-2"
              />
            </div>
          )}

          {(form.recurrence === "weekly" || form.recurrence === "custom") && (
            <div className="flex gap-2">
              {WEEKDAYS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    form.daysOfWeek.includes(day)
                      ? "bg-accent text-accent-foreground"
                      : "border border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                  form.assignedTo.includes(m.id)
                    ? "bg-accent text-accent-foreground"
                    : "border border-border"
                }`}
              >
                <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                {m.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || form.assignedTo.length === 0}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {editingId ? "Uložit změny" : "Přidat úkol"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Úkol, který je splatný dnes, se na stránce Dnes objeví ihned — není potřeba čekat na
            půlnoc.
          </p>
        </form>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Šablony úkolů</h2>
        {templates.length === 0 && <p className="text-sm text-zinc-500">Zatím žádné úkoly.</p>}
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <div>
              <p className={`font-medium ${!template.active ? "text-zinc-400 line-through" : ""}`}>
                {template.category && <span className="mr-1">{categoryInfo(template.category).icon}</span>}
                {template.title}
              </p>
              <p className="text-sm text-zinc-500">
                +{formatXp(template.xpValue)} XP · {recurrenceLabel(template)} ·{" "}
                {template.assignedTo
                  .map((id) => members.find((m) => m.id === id)?.name ?? id)
                  .join(", ")}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => startEdit(template)} className="text-sm text-accent">
                Upravit
              </button>
              <button type="button" onClick={() => toggleActive(template)} className="text-sm text-accent">
                {template.active ? "Deaktivovat" : "Aktivovat"}
              </button>
              <button type="button" onClick={() => removeTemplate(template)} className="text-sm text-danger">
                Smazat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
