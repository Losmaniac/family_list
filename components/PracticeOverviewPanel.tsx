"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { PRACTICE_SUBJECTS, PRACTICE_SUBJECT_TOTALS } from "@/lib/practice";
import Avatar from "@/components/Avatar";
import type { Member, PracticeProgress } from "@/lib/types";

/** Parent-only overview of every family member's Vzdělání progress, per subject. */
export default function PracticeOverviewPanel({ familyId }: { familyId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [progressByMember, setProgressByMember] = useState<Record<string, PracticeProgress>>({});

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "practiceProgress"), (snapshot) => {
      const next: Record<string, PracticeProgress> = {};
      for (const progressDoc of snapshot.docs) {
        next[progressDoc.id] = { id: progressDoc.id, ...progressDoc.data() } as PracticeProgress;
      }
      setProgressByMember(next);
    });
  }, [familyId]);

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <h2 className="font-medium">Přehled rodiny</h2>
      {members.length === 0 ? (
        <p className="text-sm text-zinc-500">Zatím žádní členové rodiny.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((m) => {
            const progress = progressByMember[m.id];
            return (
              <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                  <p className="font-medium">{m.name}</p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
                  {PRACTICE_SUBJECTS.map((s) => {
                    const total = PRACTICE_SUBJECT_TOTALS[s.id];
                    if (!total) return null;
                    const done = progress?.[s.id as keyof PracticeProgress]?.length ?? 0;
                    return (
                      <span key={s.id}>
                        {s.label}: {done}/{total}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
