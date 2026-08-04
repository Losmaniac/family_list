"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import WeekSchedule from "@/components/WeekSchedule";
import type { Member, TaskTemplate } from "@/lib/types";

export default function FamilyPage() {
  const { familyId, member } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);

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

  async function handleReassignDay(template: TaskTemplate, fromDay: number, toDay: number) {
    if (!familyId) return;
    const nextDays = Array.from(new Set([...template.daysOfWeek.filter((d) => d !== fromDay), toDay]));
    await updateDoc(doc(getDb(), "families", familyId, "taskTemplates", template.id), {
      daysOfWeek: nextDays,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Úkoly celé rodiny</h1>
      <p className="text-sm text-zinc-500">Přehled aktivních úkolů všech členů rodiny na tento týden.</p>
      <WeekSchedule
        templates={templates}
        members={members}
        onReassignDay={member?.role === "parent" ? handleReassignDay : undefined}
      />
    </div>
  );
}
