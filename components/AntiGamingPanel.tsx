"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/firebase";
import type { Member, XpLedgerEntry } from "@/lib/types";

const RAPID_WINDOW_MS = 2 * 60 * 1000;
const RAPID_THRESHOLD = 2;

interface FlaggedMember {
  member: Member;
  count: number;
  lastAt: number;
}

/**
 * Purely observational — flags a pattern for a parent to look at, never
 * blocks or reverses anything. Computed client-side from the last 200
 * task_completed ledger entries the parent can already read; not a new
 * write path or authority.
 */
export default function AntiGamingPanel({ familyId, members }: { familyId: string; members: Member[] }) {
  const [entries, setEntries] = useState<XpLedgerEntry[]>([]);

  useEffect(() => {
    const ledgerQuery = query(
      collection(getDb(), "families", familyId, "xpLedger"),
      where("reason", "==", "task_completed"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    return onSnapshot(ledgerQuery, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpLedgerEntry));
    });
  }, [familyId]);

  const byUser = new Map<string, number[]>();
  for (const entry of entries) {
    const list = byUser.get(entry.userId) ?? [];
    list.push(entry.timestamp);
    byUser.set(entry.userId, list);
  }

  const flagged: FlaggedMember[] = [];
  for (const [userId, timestamps] of byUser) {
    const sorted = [...timestamps].sort((a, b) => a - b);
    let rapidCount = 0;
    let lastAt = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] < RAPID_WINDOW_MS) {
        rapidCount += 1;
        lastAt = sorted[i];
      }
    }
    if (rapidCount >= RAPID_THRESHOLD) {
      const member = members.find((m) => m.id === userId);
      if (member) flagged.push({ member, count: rapidCount, lastAt });
    }
  }

  if (flagged.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <AlertTriangle size={16} /> Rychlé plnění úkolů za sebou
      </h2>
      <p className="text-xs text-zinc-500">
        Z posledních 200 splněných úkolů v rodině — informace pro rodiče, nic se automaticky nemění ani netrestá.
      </p>
      <div className="flex flex-col gap-1.5">
        {flagged.map(({ member, count, lastAt }) => (
          <div key={member.id} className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm">
            <p className="font-medium">{member.name}</p>
            <p className="text-xs text-zinc-500">
              {count}× splnění do 2 minut od předchozího · naposledy {new Date(lastAt).toLocaleString("cs-CZ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
