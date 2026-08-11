"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Gift } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { logAction } from "@/lib/audit-log";
import type { Member, Reward, RewardRedemption } from "@/lib/types";

/**
 * Parent-only: reward redemptions still needing a decision, and ones
 * already approved but not yet actually handed over (see
 * components/ShopAdminPanel.tsx, which shows the same two lists buried in
 * Shop → admin — this mirrors them on Today, matching AppBadgeSync's
 * redemptions count, so the badge means something a parent can find).
 */
export default function PendingRewardRedemptions({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<RewardRedemption[]>([]);
  const [awaitingFulfillment, setAwaitingFulfillment] = useState<RewardRedemption[]>([]);
  const [rewards, setRewards] = useState<Record<string, Reward>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    const q = query(collection(getDb(), "families", familyId, "rewardRedemptions"), where("status", "==", "requested"));
    return onSnapshot(q, (snap) => setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption)));
  }, [familyId]);

  useEffect(() => {
    const q = query(collection(getDb(), "families", familyId, "rewardRedemptions"), where("status", "==", "approved"));
    return onSnapshot(q, (snap) => setAwaitingFulfillment(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption)));
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "rewards"), (snap) => {
      const next: Record<string, Reward> = {};
      for (const d of snap.docs) next[d.id] = { id: d.id, ...d.data() } as Reward;
      setRewards(next);
    });
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snap) => {
      const next: Record<string, Member> = {};
      for (const d of snap.docs) next[d.id] = { id: d.id, ...d.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  async function handleDecision(redemption: RewardRedemption, status: "approved" | "rejected") {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), { status });
      if (user) {
        const reward = rewards[redemption.rewardId];
        const requester = members[redemption.userId];
        logAction(
          familyId,
          user.uid,
          "reward_redemption_decided",
          `${reward?.title ?? redemption.rewardId} — ${requester?.name ?? redemption.userId}: ${status === "approved" ? "schváleno" : "zamítnuto"}`
        );
      }
    } catch {
      toast.error("Nepodařilo se uložit rozhodnutí.");
    }
  }

  async function handleFulfill(redemption: RewardRedemption) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), { status: "fulfilled" });
      if (user) {
        const reward = rewards[redemption.rewardId];
        const requester = members[redemption.userId];
        logAction(
          familyId,
          user.uid,
          "reward_redemption_decided",
          `${reward?.title ?? redemption.rewardId} — ${requester?.name ?? redemption.userId}: vyřízeno`
        );
      }
      toast.success("Odměna označena jako vyřízená.");
    } catch {
      toast.error("Nepodařilo se označit odměnu jako vyřízenou.");
    }
  }

  if (pending.length === 0 && awaitingFulfillment.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <Gift size={16} /> Odměny z obchodu
      </h2>
      {pending.map((redemption) => {
        const reward = rewards[redemption.rewardId];
        const requester = members[redemption.userId];
        return (
          <div key={redemption.id} className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
              <p className="truncate text-sm text-zinc-500">{requester?.name ?? redemption.userId} · čeká na schválení</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleDecision(redemption, "approved")}
                className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
              >
                Schválit
              </button>
              <button
                type="button"
                onClick={() => handleDecision(redemption, "rejected")}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
              >
                Zamítnout
              </button>
            </div>
          </div>
        );
      })}
      {awaitingFulfillment.map((redemption) => {
        const reward = rewards[redemption.rewardId];
        const requester = members[redemption.userId];
        return (
          <div key={redemption.id} className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
              <p className="truncate text-sm text-zinc-500">{requester?.name ?? redemption.userId} · schváleno, čeká na vyřízení</p>
            </div>
            <button
              type="button"
              onClick={() => handleFulfill(redemption)}
              className="shrink-0 rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
            >
              Označit jako vyřízené
            </button>
          </div>
        );
      })}
    </section>
  );
}
