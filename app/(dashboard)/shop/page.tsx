"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import RewardShop from "@/components/RewardShop";
import { REWARD_PRESET_TIERS, type RewardPreset } from "@/lib/reward-presets";
import type { Member, Reward, RewardRedemption, RewardRedemptionStatus } from "@/lib/types";

const STATUS_LABELS: Record<RewardRedemptionStatus, string> = {
  requested: "Čeká na schválení",
  approved: "Schváleno · čeká na vyřízení",
  fulfilled: "Vyřízeno",
  rejected: "Zamítnuto",
};

const STATUS_COLORS: Record<RewardRedemptionStatus, string> = {
  requested: "text-accent",
  approved: "text-accent",
  fulfilled: "text-success",
  rejected: "text-danger",
};

export default function ShopPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<RewardRedemption[]>([]);
  const [awaitingFulfillment, setAwaitingFulfillment] = useState<RewardRedemption[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<RewardRedemption[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});

  const [title, setTitle] = useState("");
  const [xpCost, setXpCost] = useState(50);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [bulkAddingTier, setBulkAddingTier] = useState<string | null>(null);

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
    const fulfillmentQuery = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("status", "==", "approved")
    );
    return onSnapshot(fulfillmentQuery, (snapshot) => {
      setAwaitingFulfillment(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption));
    });
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId || !user) return;
    const myQuery = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    return onSnapshot(myQuery, (snapshot) => {
      setMyRedemptions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption));
    });
  }, [familyId, user]);

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

  async function handleFulfill(redemption: RewardRedemption) {
    if (!familyId) return;
    await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), {
      status: "fulfilled",
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
      setShowRewardForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  function applyPreset(preset: RewardPreset) {
    setTitle(preset.title);
    setXpCost(preset.xpCost);
    setApprovalRequired(preset.approvalRequired);
    setShowRewardForm(true);
  }

  async function handleAddAllInTier(tierLabel: string, presets: RewardPreset[]) {
    if (!familyId) return;
    const existingTitles = new Set(rewards.map((r) => r.title));
    const toAdd = presets.filter((p) => !existingTitles.has(p.title));
    if (toAdd.length === 0) return;

    setBulkAddingTier(tierLabel);
    try {
      const batch = writeBatch(getDb());
      const rewardsRef = collection(getDb(), "families", familyId, "rewards");
      for (const preset of toAdd) {
        batch.set(doc(rewardsRef), {
          title: preset.title,
          xpCost: preset.xpCost,
          approvalRequired: preset.approvalRequired,
          active: true,
        });
      }
      await batch.commit();
    } finally {
      setBulkAddingTier(null);
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

      {myRedemptions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Moje odměny</h2>
          {myRedemptions.map((redemption) => {
            const reward = rewards.find((r) => r.id === redemption.rewardId);
            return (
              <div
                key={redemption.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
                <span className={`text-sm font-medium ${STATUS_COLORS[redemption.status]}`}>
                  {STATUS_LABELS[redemption.status]}
                </span>
              </div>
            );
          })}
        </section>
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
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
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
                        className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                      >
                        Zamítnout
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {awaitingFulfillment.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-medium">Schváleno · čeká na vyřízení</h2>
              {awaitingFulfillment.map((redemption) => {
                const reward = rewards.find((r) => r.id === redemption.rewardId);
                const requester = members[redemption.userId];
                return (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
                      <p className="text-sm text-zinc-500">{requester?.name ?? redemption.userId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFulfill(redemption)}
                      className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                    >
                      Označit jako vyřízené
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Katalog odměn</h2>
            {REWARD_PRESET_TIERS.map((tier) => {
              const existingTitles = new Set(rewards.map((r) => r.title));
              const remaining = tier.presets.filter((p) => !existingTitles.has(p.title));
              return (
                <div key={tier.label} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                      {tier.label} <span className="text-zinc-400">· {tier.hint}</span>
                    </p>
                    {remaining.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddAllInTier(tier.label, tier.presets)}
                        disabled={bulkAddingTier === tier.label}
                        className="text-xs font-semibold text-accent disabled:opacity-40"
                      >
                        {bulkAddingTier === tier.label ? "Přidávám…" : `Přidat všech ${remaining.length}`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tier.presets.map((preset) => {
                      const alreadyAdded = existingTitles.has(preset.title);
                      return (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          disabled={alreadyAdded}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                            alreadyAdded
                              ? "border-border bg-surface-muted text-zinc-400"
                              : "border-border bg-surface"
                          }`}
                        >
                          <span>{preset.icon}</span>
                          {preset.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {!showRewardForm && (
            <button
              type="button"
              onClick={() => setShowRewardForm(true)}
              className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              + Vlastní odměna
            </button>
          )}

          {showRewardForm && (
            <form onSubmit={handleCreateReward} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <h2 className="font-medium">Přidat odměnu</h2>
              <input
                type="text"
                placeholder="Název odměny"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <input
                type="number"
                min={1}
                value={xpCost}
                onChange={(e) => setXpCost(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={approvalRequired}
                  onChange={(e) => setApprovalRequired(e.target.checked)}
                />
                Vyžaduje schválení rodičem
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-40"
                >
                  Přidat odměnu
                </button>
                <button
                  type="button"
                  onClick={() => setShowRewardForm(false)}
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
