"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Zap } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { logAction } from "@/lib/audit-log";
import { formatXp } from "@/lib/xp-engine";
import type { Member, XpAdjustmentRequest } from "@/lib/types";

/**
 * A one-off XP grant/deduction another parent requested (see
 * app/(dashboard)/settings/page.tsx's member "XP" button) needing this
 * parent's approval — shown on Today rather than buried in Settings, and
 * styled distinctly (violet, not the accent/amber used for task-photo
 * approvals) since it's a rarer, higher-stakes kind of request than the
 * everyday task review right above it.
 */
export default function PendingXpAdjustments({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<XpAdjustmentRequest[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    const pendingQuery = query(
      collection(getDb(), "families", familyId, "xpAdjustmentRequests"),
      where("status", "==", "requested")
    );
    return onSnapshot(pendingQuery, (snapshot) => {
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpAdjustmentRequest));
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId]);

  async function handleDecide(request: XpAdjustmentRequest, status: "approved" | "rejected") {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "xpAdjustmentRequests", request.id), { status });
      if (user) {
        const target = members[request.targetUserId];
        logAction(
          familyId,
          user.uid,
          "xp_adjustment_decided",
          `${target?.name ?? request.targetUserId}: ${request.delta >= 0 ? "+" : ""}${formatXp(request.delta)} XP ${status === "approved" ? "schváleno" : "zamítnuto"}`
        );
      }
    } catch {
      toast.error("Nepodařilo se uložit rozhodnutí.");
    }
  }

  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
        <Zap size={16} /> Zvláštní žádost — úprava XP
      </h2>
      {requests.map((request) => {
        const target = members[request.targetUserId];
        const requester = members[request.requestedBy];
        const isOwnRequest = request.requestedBy === user?.uid;
        return (
          <div
            key={request.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {target?.name ?? request.targetUserId}: {request.delta >= 0 ? "+" : ""}
                {formatXp(request.delta)} XP
              </p>
              <p className="truncate text-sm text-zinc-500">
                {request.reason} · požádal(a) {requester?.name ?? request.requestedBy}
              </p>
            </div>
            {isOwnRequest ? (
              <span className="shrink-0 text-sm text-zinc-400">Čeká na druhého rodiče</span>
            ) : (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecide(request, "approved")}
                  className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                >
                  Schválit
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
