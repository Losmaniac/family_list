"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { TASK_PRESET_CATEGORIES, type TaskPreset } from "@/lib/task-presets";
import Avatar from "@/components/Avatar";
import WeekSchedule from "@/components/WeekSchedule";
import type { Member, Recurrence, TaskTemplate } from "@/lib/types";

const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    title: "",
    description: "",
    xpValue: 10,
    recurrence: "daily" as Recurrence,
    daysOfWeek: [] as number[],
    date: todayKey(),
    assignedTo: [] as string[],
  };
}

export default function AssignPage() {
  const { familyId, member } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      xpValue: template.xpValue,
      recurrence: template.recurrence,
      daysOfWeek: template.daysOfWeek,
      date: template.date ?? todayKey(),
      assignedTo: template.assignedTo,
    });
    setShowForm(true);
  }

  function applyPreset(preset: TaskPreset) {
    setForm((prev) => ({
      ...prev,
      title: preset.title,
      xpValue: preset.xpValue,
      recurrence: preset.recurrence,
      daysOfWeek: preset.daysOfWeek,
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
        xpValue: form.xpValue,
        recurrence: form.recurrence,
        assignedTo: form.assignedTo,
        daysOfWeek: form.recurrence === "weekly" || form.recurrence === "custom" ? form.daysOfWeek : [],
        date: form.recurrence === "once" ? form.date : null,
        active: true,
      };

      if (editingId) {
        await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", editingId), payload);
      } else {
        await addDoc(collection(getDb(), "families", familyId, "taskTemplates"), payload);
      }
      cancelEdit();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(template: TaskTemplate) {
    if (!familyId) return;
    await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id), {
      active: !template.active,
    });
  }

  async function removeTemplate(template: TaskTemplate) {
    if (!familyId) return;
    if (!confirm(`Smazat úkol „${template.title}“?`)) return;
    await deleteDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id));
    if (editingId === template.id) cancelEdit();
  }

  function recurrenceLabel(template: TaskTemplate): string {
    if (template.recurrence === "once") return template.date ?? "jednorázově";
    if (template.recurrence === "daily") return "denně";
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
        <WeekSchedule templates={templates} members={members} />
      </section>

      {!showForm && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Rychlé přidání</h2>
          {TASK_PRESET_CATEGORIES.map((category) => (
            <div key={category.label} className="flex flex-col gap-1.5">
              <p className="text-sm text-zinc-500">{category.label}</p>
              <div className="flex flex-wrap gap-2">
                {category.presets.map((preset) => (
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

          <select
            value={form.recurrence}
            onChange={(e) => setForm((prev) => ({ ...prev, recurrence: e.target.value as Recurrence }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          >
            <option value="once">Jednorázově</option>
            <option value="daily">Denně</option>
            <option value="weekly">Týdně (vybrané dny)</option>
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
                {template.title}
              </p>
              <p className="text-sm text-zinc-500">
                +{template.xpValue} XP · {recurrenceLabel(template)} ·{" "}
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
