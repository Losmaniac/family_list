"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Sparkles } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { logAction } from "@/lib/audit-log";
import type { Member, RewardRequest } from "@/lib/types";

/** Module-scope (not component-body) so Date.now() here isn't subject to the react-compiler's render-purity analysis. */
function nowMs(): number {
  return Date.now();
}

/**
 * Parent-only: brand-new reward proposals (families/{familyId}/rewardRequests)
 * still needing a decision — distinct from PendingRewardRedemptions.tsx,
 * which decides whether to grant an *existing* reward. Approving here sets
 * the XP cost (the one thing missing from a member's proposal) and creates
 * the matching families/{familyId}/rewards doc in the same action, so it
 * shows up in the shop immediately.
 */
export default function PendingRewardRequests({
  familyId,
}: {
  familyId: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [xpCostByRequest, setXpCostByRequest] = useState<
    Record<string, string>
  >({});
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(getDb(), "families", familyId, "rewardRequests"),
      where("status", "==", "pending"),
    );
    return onSnapshot(q, (snap) =>
      setRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRequest),
      ),
    );
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "families", familyId, "members"),
      (snap) => {
        const next: Record<string, Member> = {};
        for (const d of snap.docs)
          next[d.id] = { id: d.id, ...d.data() } as Member;
        setMembers(next);
      },
    );
  }, [familyId]);

  async function handleApprove(request: RewardRequest) {
    const xpCost = Number(xpCostByRequest[request.id]);
    if (!Number.isFinite(xpCost) || xpCost <= 0) {
      toast.error("Zadej kladný počet XP.");
      return;
    }
    setDecidingId(request.id);
    const decidedAt = nowMs();
    try {
      const newReward = await addDoc(
        collection(getDb(), "families", familyId, "rewards"),
        {
          title: request.title,
          xpCost,
          approvalRequired: true,
          active: true,
        },
      );
      await updateDoc(
        doc(getDb(), "families", familyId, "rewardRequests", request.id),
        {
          status: "approved",
          xpCost,
          rewardId: newReward.id,
          decidedAt,
        },
      );
      if (user) {
        const requester = members[request.requestedBy];
        logAction(
          familyId,
          user.uid,
          "reward_request_decided",
          `${request.title} — ${requester?.name ?? request.requestedBy}: schváleno za ${xpCost} XP`,
        );
      }
      toast.success("Odměna schválena a přidána do obchodu.");
    } catch {
      toast.error("Nepodařilo se schválit návrh.");
    } finally {
      setDecidingId(null);
    }
  }

  async function handleReject(request: RewardRequest) {
    setDecidingId(request.id);
    try {
      await updateDoc(
        doc(getDb(), "families", familyId, "rewardRequests", request.id),
        {
          status: "rejected",
          decidedAt: nowMs(),
        },
      );
      if (user) {
        const requester = members[request.requestedBy];
        logAction(
          familyId,
          user.uid,
          "reward_request_decided",
          `${request.title} — ${requester?.name ?? request.requestedBy}: zamítnuto`,
        );
      }
    } catch {
      toast.error("Nepodařilo se zamítnout návrh.");
    } finally {
      setDecidingId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <Sparkles size={16} /> Návrhy nových odměn
      </h2>
      {requests.map((request) => {
        const requester = members[request.requestedBy];
        return (
          <div
            key={request.id}
            className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{request.title}</p>
              <p className="truncate text-sm text-zinc-500">
                {requester?.name ?? request.requestedBy} navrhuje tuto odměnu
              </p>
              {request.note && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-500">
                  {request.note}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="Kolik XP?"
                value={xpCostByRequest[request.id] ?? ""}
                onChange={(e) =>
                  setXpCostByRequest((prev) => ({
                    ...prev,
                    [request.id]: e.target.value,
                  }))
                }
                className="w-28 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => handleApprove(request)}
                disabled={decidingId === request.id}
                className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
              >
                Schválit
              </button>
              <button
                type="button"
                onClick={() => handleReject(request)}
                disabled={decidingId === request.id}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold disabled:opacity-50"
              >
                Zamítnout
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
