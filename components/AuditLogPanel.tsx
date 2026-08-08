"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { History } from "lucide-react";
import { getDb } from "@/lib/firebase";
import type { AuditAction, AuditLogEntry, Member } from "@/lib/types";

const ACTION_LABELS: Record<AuditAction, string> = {
  member_role_changed: "Změna role",
  member_removed: "Odebrání člena",
  xp_adjustment_decided: "Rozhodnutí o úpravě XP",
  task_approved: "Schválení úkolu",
  task_returned: "Vrácení úkolu",
  task_completion_reverted: "Odebrání XP za úkol",
  task_template_deleted: "Smazání úkolu",
  reward_redemption_decided: "Rozhodnutí o odměně",
  pooled_contribution_decided: "Rozhodnutí o sbírce",
  chat_cleared: "Vymazání historie chatu",
  photos_cleared: "Vymazání fotek úkolů",
  audit_log_cleared: "Vymazání historie akcí",
  investment_deleted: "Smazání investice",
};

export default function AuditLogPanel({ familyId, members }: { familyId: string; members: Member[] }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    const auditQuery = query(
      collection(getDb(), "families", familyId, "auditLog"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    return onSnapshot(auditQuery, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry));
    });
  }, [familyId]);

  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <History size={16} /> Historie akcí
      </h2>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => {
          const actor = members.find((m) => m.id === entry.actorId);
          return (
            <div key={entry.id} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p>
                <span className="font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</span>{" "}
                <span className="text-zinc-500">— {entry.detail}</span>
              </p>
              <p className="text-xs text-zinc-500">
                {actor?.name ?? entry.actorId} · {new Date(entry.timestamp).toLocaleString("cs-CZ")}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
