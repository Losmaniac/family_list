"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { JournalDeletionRequest, Member } from "@/lib/types";

/**
 * A parent's request to delete a journal or one of its entries, waiting on
 * a *different* parent's approval — shown on Today next to the other
 * "needs a second parent" review (PendingXpAdjustments), styled with the
 * same destructive red used everywhere else in the app for delete actions
 * since that's what this ultimately is, deferred behind approval.
 */
export default function PendingJournalDeletions({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<JournalDeletionRequest[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    const pendingQuery = query(
      collection(getDb(), "families", familyId, "journalDeletionRequests"),
      where("status", "==", "requested")
    );
    return onSnapshot(pendingQuery, (snapshot) => {
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as JournalDeletionRequest));
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  async function handleDecide(request: JournalDeletionRequest, status: "approved" | "rejected") {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "journalDeletionRequests", request.id), { status });
    } catch {
      toast.error("Nepodařilo se uložit rozhodnutí.");
    }
  }

  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-danger">
        <Trash2 size={16} /> Žádost o smazání z Deníků
      </h2>
      {requests.map((request) => {
        const requester = members[request.requestedBy];
        const isOwnRequest = request.requestedBy === user?.uid;
        return (
          <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {request.targetType === "journal" ? "Celý deník" : "Záznam"}: {request.targetLabel}
              </p>
              <p className="text-sm text-zinc-500">požádal(a) {requester?.name ?? request.requestedBy}</p>
            </div>
            {isOwnRequest ? (
              <span className="shrink-0 text-sm text-zinc-400">Čeká na druhého rodiče</span>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecide(request, "approved")}
                  className="rounded-full bg-danger px-3 py-1 text-sm font-semibold text-white"
                >
                  Smazat
                </button>
                <button
                  type="button"
                  onClick={() => handleDecide(request, "rejected")}
                  className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                >
                  Zamítnout
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
