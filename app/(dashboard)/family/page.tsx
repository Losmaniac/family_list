"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Users } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { isDue } from "@/lib/task-scheduler";
import { categoryInfo } from "@/lib/categories";
import { dayOfWeekInFamilyZone } from "@/lib/date-utils";
import Avatar from "@/components/Avatar";
import type { Member, TaskTemplate } from "@/lib/types";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
// JS Date.getDay() convention (0=Sun..6=Sat) — matches TaskTemplate.daysOfWeek.
const DISPLAY_TO_JS_DAY = [1, 2, 3, 4, 5, 6, 0];

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function todayDisplayIndex(): number {
  return DISPLAY_TO_JS_DAY.indexOf(dayOfWeekInFamilyZone(new Date()));
}

export default function FamilyPage() {
  const { familyId } = useFamily();
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(todayDisplayIndex);

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

  const monday = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const selectedDate = weekDates[selectedIndex];
  const isToday = selectedIndex === todayDisplayIndex();

  const dueTemplates = templates.filter((t) => t.active && isDue(t, selectedDate));
  const byMember = members
    .map((m) => ({ member: m, tasks: dueTemplates.filter((t) => t.assignedTo.includes(m.id)) }))
    .filter((entry) => entry.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Úkoly celé rodiny</h1>
        <p className="text-sm text-zinc-500">
          {isToday ? "Dnes" : `${DAY_LABELS[selectedIndex]} ${selectedDate.getDate()}.`}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1">
        {weekDates.map((date, i) => {
          const active = i === selectedIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`flex min-w-[48px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
                active ? "bg-accent text-accent-foreground" : "bg-surface-muted text-zinc-500"
              }`}
            >
              {DAY_LABELS[i]}
              <span className="text-[10px] font-normal">{date.getDate()}.</span>
            </button>
          );
        })}
      </div>

      {byMember.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <Users size={40} />
          <p className="text-lg">Žádné úkoly na tento den.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {byMember.map(({ member, tasks }) => (
            <section key={member.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                <h2 className="font-medium">{member.name}</h2>
              </div>
              <div className="flex flex-col gap-2">
                {tasks.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <p className="min-w-0 truncate font-medium">
                      {template.category && `${categoryInfo(template.category).icon} `}
                      {template.title}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-accent">+{template.xpValue} XP</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
