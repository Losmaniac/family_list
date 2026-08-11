"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Camera, X } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { logAction } from "@/lib/audit-log";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import type { AdHocTaskCompletion, AdHocTaskType, Member } from "@/lib/types";

/** Module-scope (not component-body) so Date.now() here isn't subject to the react-compiler's render-purity analysis. */
function nowMs(): number {
  return Date.now();
}

/**
 * A jednorázový úkol whose type requires a photo doesn't award XP the
 * moment it's completed (see functions/src/adHocTasks.ts) — it sits here
 * 'pending' until a parent actually looks at the photo, same review step
 * regular tasks already get on Today. Approving/rejecting is a direct
 * client write to the completion's status (firestore.rules gates it to a
 * parent, only while still 'pending'); the XP award itself always happens
 * server-side in onAdHocCompletionDecided, never here.
 */
export default function PendingAdHocApprovals({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [completions, setCompletions] = useState<AdHocTaskCompletion[]>([]);
  const [types, setTypes] = useState<Record<string, AdHocTaskType>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const pendingQuery = query(collection(getDb(), "families", familyId, "adHocCompletions"), where("status", "==", "pending"));
    return onSnapshot(pendingQuery, (snapshot) => {
      setCompletions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AdHocTaskCompletion));
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "adHocTaskTypes"), (snapshot) => {
      const next: Record<string, AdHocTaskType> = {};
      for (const d of snapshot.docs) next[d.id] = { id: d.id, ...d.data() } as AdHocTaskType;
      setTypes(next);
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const d of snapshot.docs) next[d.id] = { id: d.id, ...d.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  async function handleDecide(completion: AdHocTaskCompletion, status: "approved" | "rejected") {
    if (!user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "adHocCompletions", completion.id), {
        status,
        decidedBy: user.uid,
        decidedAt: nowMs(),
      });
      const type = types[completion.typeId];
      const doer = members[completion.completedBy];
      logAction(
        familyId,
        user.uid,
        "task_approved",
        `${type?.title ?? completion.typeId} (jednorázový, ${doer?.name ?? completion.completedBy}) — ${status === "approved" ? "schváleno" : "zamítnuto"}`
      );
    } catch {
      toast.error("Nepodařilo se uložit rozhodnutí.");
    }
  }

  if (completions.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">Jednorázové úkoly ke schválení</h2>
      {completions.map((completion) => {
        const type = types[completion.typeId];
        const doer = members[completion.completedBy];
        if (!type) return null;
        return (
          <div key={completion.id} className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-3">
              {completion.photoUrl && (
                <button type="button" onClick={() => setExpandedPhotoUrl(completion.photoUrl!)} className="shrink-0" aria-label="Zvětšit foto">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset */}
                  <img src={completion.photoUrl} alt="Foto potvrzení úkolu" className="h-12 w-12 rounded-lg object-cover" />
                </button>
              )}
              {doer && <Avatar name={doer.name} avatarUrl={doer.avatarUrl} size="sm" />}
              <div>
                <p className="font-medium">{type.title}</p>
                <p className="text-sm text-zinc-500">
                  {doer?.name ?? completion.completedBy} · +{formatXp(type.xpValue)} XP
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDecide(completion, "approved")}
                className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
              >
                Schválit
              </button>
              <button
                type="button"
                onClick={() => handleDecide(completion, "rejected")}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
              >
                Zamítnout
              </button>
            </div>
          </div>
        );
      })}

      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Camera size={12} /> Klikni na náhled fota pro zvětšení
      </span>

      {expandedPhotoUrl &&
        createPortal(
          // Portaled to <body> — see the comment in InvestDemoPanel's trade
          // drawer for why a `fixed inset-0` nested inside <main> can't
          // out-rank the bottom nav bar.
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setExpandedPhotoUrl(null)}
          >
            <button
              type="button"
              onClick={() => setExpandedPhotoUrl(null)}
              aria-label="Zavřít"
              className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL, not a static asset */}
            <img
              src={expandedPhotoUrl}
              alt="Foto potvrzení úkolu"
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </section>
  );
}
