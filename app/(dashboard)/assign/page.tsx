"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import type { Member, Recurrence, TaskTemplate } from "@/lib/types";

const WEEKDAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

export default function AssignPage() {
  const { familyId, member } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

  const [title, setTitle] = useState("");
  const [xpValue, setXpValue] = useState(10);
  const [recurrence, setRecurrence] = useState<Recurrence>("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function toggleAssignee(userId: string) {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || assignedTo.length === 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "taskTemplates"), {
        title,
        xpValue,
        recurrence,
        assignedTo,
        daysOfWeek: recurrence === "daily" ? [] : daysOfWeek,
        active: true,
      });
      setTitle("");
      setXpValue(10);
      setAssignedTo([]);
      setDaysOfWeek([]);
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

  if (member?.role !== "parent") {
    return <p className="text-zinc-500">Dostupné pouze pro rodiče.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Zadávání úkolů</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Název úkolu"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
        />

        <input
          type="number"
          min={1}
          value={xpValue}
          onChange={(e) => setXpValue(Number(e.target.value))}
          className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
        />

        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="daily">Denně</option>
          <option value="weekly">Týdně</option>
          <option value="custom">Vlastní dny</option>
        </select>

        {recurrence !== "daily" && (
          <div className="flex gap-2">
            {WEEKDAYS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1 text-sm ${
                  daysOfWeek.includes(day)
                    ? "bg-amber-500 text-white"
                    : "border border-zinc-200 dark:border-zinc-800"
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
              className={`rounded-full px-3 py-1 text-sm ${
                assignedTo.includes(m.id)
                  ? "bg-amber-500 text-white"
                  : "border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting || assignedTo.length === 0}
          className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          Přidat úkol
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="font-medium">Šablony úkolů</h2>
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{template.title}</p>
              <p className="text-sm text-zinc-500">+{template.xpValue} XP</p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(template)}
              className="text-sm text-amber-600"
            >
              {template.active ? "Deaktivovat" : "Aktivovat"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
