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
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import RewardShop from "@/components/RewardShop";
import type { Member, Reward, RewardRedemption } from "@/lib/types";

export default function ShopPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<RewardRedemption[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});

  const [title, setTitle] = useState("");
  const [xpCost, setXpCost] = useState(50);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "rewards"), (snapshot) => {
      setRewards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    const pendingQuery = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("status", "==", "requested")
    );
    return onSnapshot(pendingQuery, (snapshot) => {
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption));
    });
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId, member?.role]);

  async function handleRedeem(reward: Reward) {
    if (!familyId || !user) return;
    await addDoc(collection(getDb(), "families", familyId, "rewardRedemptions"), {
      userId: user.uid,
      rewardId: reward.id,
      status: reward.approvalRequired ? "requested" : "approved",
      timestamp: Date.now(),
    });
  }

  async function handleDecision(redemption: RewardRedemption, status: "approved" | "rejected") {
    if (!familyId) return;
    await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), {
      status,
    });
  }

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "rewards"), {
        title,
        xpCost,
        approvalRequired,
        active: true,
      });
      setTitle("");
      setXpCost(50);
      setApprovalRequired(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">XP obchod</h1>

      {rewards.length === 0 ? (
        <p className="text-zinc-500">Zatím žádné odměny.</p>
      ) : (
        <RewardShop rewards={rewards} xpBalance={member?.xpBalance ?? 0} onRedeem={handleRedeem} />
      )}

      {member?.role === "parent" && (
        <>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-medium">Čeká na schválení</h2>
              {pending.map((redemption) => {
                const reward = rewards.find((r) => r.id === redemption.rewardId);
                const requester = members[redemption.userId];
                return (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                  >
                    <div>
                      <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
                      <p className="text-sm text-zinc-500">{requester?.name ?? redemption.userId}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(redemption, "approved")}
                        className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-white"
                      >
                        Schválit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(redemption, "rejected")}
                        className="rounded-full bg-zinc-200 px-3 py-1 text-sm font-semibold dark:bg-zinc-800"
                      >
                        Zamítnout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleCreateReward} className="flex flex-col gap-3">
            <h2 className="font-medium">Přidat odměnu</h2>
            <input
              type="text"
              placeholder="Název odměny"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            />
            <input
              type="number"
              min={1}
              value={xpCost}
              onChange={(e) => setXpCost(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
              />
              Vyžaduje schválení rodičem
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
            >
              Přidat odměnu
            </button>
          </form>
        </>
      )}
    </div>
  );
}
