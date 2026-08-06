"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { logAction } from "@/lib/audit-log";
import { REWARD_PRESET_TIERS, type RewardPreset } from "@/lib/reward-presets";
import type { Member, PooledContribution, Reward, RewardRedemption } from "@/lib/types";

export default function ShopAdminPanel({ familyId, members }: { familyId: string; members: Member[] }) {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pending, setPending] = useState<RewardRedemption[]>([]);
  const [awaitingFulfillment, setAwaitingFulfillment] = useState<RewardRedemption[]>([]);
  const [pools, setPools] = useState<PooledContribution[]>([]);

  const [title, setTitle] = useState("");
  const [xpCost, setXpCost] = useState(50);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [bulkAddingTier, setBulkAddingTier] = useState<string | null>(null);

  const [showPoolForm, setShowPoolForm] = useState(false);
  const [poolRewardId, setPoolRewardId] = useState("");
  const [poolInvitees, setPoolInvitees] = useState<string[]>([]);
  const [submittingPool, setSubmittingPool] = useState(false);

  const membersById: Record<string, Member> = Object.fromEntries(members.map((m) => [m.id, m]));

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "rewards"), (snapshot) => {
      setRewards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward));
    });
  }, [familyId]);

  useEffect(() => {
    const pendingQuery = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("status", "==", "requested")
    );
    return onSnapshot(pendingQuery, (snapshot) => {
      setPending(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption));
    });
  }, [familyId]);

  useEffect(() => {
    const fulfillmentQuery = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("status", "==", "approved")
    );
    return onSnapshot(fulfillmentQuery, (snapshot) => {
      setAwaitingFulfillment(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RewardRedemption));
    });
  }, [familyId]);

  useEffect(() => {
    const poolsQuery = query(
      collection(getDb(), "families", familyId, "pooledContributions"),
      where("status", "==", "collecting")
    );
    return onSnapshot(poolsQuery, (snapshot) => {
      setPools(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PooledContribution));
    });
  }, [familyId]);

  async function handleDecision(redemption: RewardRedemption, status: "approved" | "rejected") {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), { status });
      if (user) {
        const reward = rewards.find((r) => r.id === redemption.rewardId);
        const requester = membersById[redemption.userId];
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
      await updateDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id), {
        status: "fulfilled",
      });
      if (user) {
        const reward = rewards.find((r) => r.id === redemption.rewardId);
        const requester = membersById[redemption.userId];
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

  function togglePoolInvitee(userId: string) {
    setPoolInvitees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    if (!poolRewardId || poolInvitees.length === 0) return;
    setSubmittingPool(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "pooledContributions"), {
        rewardId: poolRewardId,
        createdBy: user?.uid,
        invitedUserIds: poolInvitees,
        contributions: {},
        status: "collecting",
        timestamp: Date.now(),
      });
      toast.success("Sbírka založena.");
      setPoolRewardId("");
      setPoolInvitees([]);
      setShowPoolForm(false);
    } catch {
      toast.error("Sbírku se nepodařilo založit.");
    } finally {
      setSubmittingPool(false);
    }
  }

  async function handleFulfillPool(pool: PooledContribution) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "pooledContributions", pool.id), { status: "fulfilled" });
      if (user) {
        const reward = rewards.find((r) => r.id === pool.rewardId);
        logAction(familyId, user.uid, "pooled_contribution_decided", `${reward?.title ?? pool.rewardId}: vyřízeno`);
      }
      toast.success("Sbírka vyřízena, XP strženo přispěvatelům.");
    } catch {
      toast.error("Sbírku se nepodařilo vyřídit.");
    }
  }

  async function handleCancelPool(pool: PooledContribution) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "pooledContributions", pool.id), { status: "cancelled" });
      if (user) {
        const reward = rewards.find((r) => r.id === pool.rewardId);
        logAction(familyId, user.uid, "pooled_contribution_decided", `${reward?.title ?? pool.rewardId}: zrušeno`);
      }
    } catch {
      toast.error("Sbírku se nepodařilo zrušit.");
    }
  }

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
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
      toast.success("Odměna byla přidána.");
    } catch {
      toast.error("Odměnu se nepodařilo přidat.");
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
    } catch {
      toast.error("Odměny se nepodařilo přidat.");
    } finally {
      setBulkAddingTier(null);
    }
  }

  async function handleToggleActive(reward: Reward) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "rewards", reward.id), { active: !reward.active });
    } catch {
      toast.error("Nepodařilo se změnit stav odměny.");
    }
  }

  async function handleDeleteReward(reward: Reward) {
    const ok = await confirm({
      title: `Smazat odměnu „${reward.title}“?`,
      description: "Tuto akci nelze vrátit zpět.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "rewards", reward.id));
      toast.success("Odměna byla smazána.");
    } catch {
      toast.error("Odměnu se nepodařilo smazat.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">Čeká na schválení</h3>
          {pending.map((redemption) => {
            const reward = rewards.find((r) => r.id === redemption.rewardId);
            const requester = membersById[redemption.userId];
            return (
              <div key={redemption.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
                  <p className="text-sm text-zinc-500">{requester?.name ?? redemption.userId}</p>
                </div>
                <div className="flex gap-2">
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
        </div>
      )}

      {awaitingFulfillment.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">Schváleno · čeká na vyřízení</h3>
          {awaitingFulfillment.map((redemption) => {
            const reward = rewards.find((r) => r.id === redemption.rewardId);
            const requester = membersById[redemption.userId];
            return (
              <div key={redemption.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
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

      {pools.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-500">Sbírky na odměnu</h3>
          {pools.map((pool) => {
            const reward = rewards.find((r) => r.id === pool.rewardId);
            const total = Object.values(pool.contributions).reduce((sum, v) => sum + v, 0);
            return (
              <div key={pool.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{reward?.title ?? pool.rewardId}</p>
                  <p className="text-zinc-500">{total}/{reward?.xpCost ?? "?"} XP</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-zinc-500">
                  {pool.invitedUserIds.map((userId) => {
                    const pledge = pool.contributions[userId];
                    return (
                      <span key={userId} className="rounded-full bg-surface-muted px-2 py-0.5">
                        {membersById[userId]?.name ?? userId}: {pledge !== undefined ? `${pledge} XP` : "čeká"}
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFulfillPool(pool)}
                    className="rounded-full bg-success px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Vyřídit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelPool(pool)}
                    className="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-semibold"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-500">Odměny</h3>
        {rewards.length === 0 ? (
          <p className="text-sm text-zinc-500">Zatím žádné odměny.</p>
        ) : (
          rewards.map((reward) => (
            <div key={reward.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className={`font-medium ${!reward.active ? "text-zinc-400 line-through" : ""}`}>{reward.title}</p>
                <p className="text-sm text-zinc-500">
                  {reward.xpCost.toLocaleString("cs-CZ")} XP · {reward.approvalRequired ? "vyžaduje schválení" : "okamžité"}
                </p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => handleToggleActive(reward)} className="text-sm text-accent">
                  {reward.active ? "Deaktivovat" : "Aktivovat"}
                </button>
                <button type="button" onClick={() => handleDeleteReward(reward)} className="text-sm text-danger">
                  Smazat
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!showPoolForm ? (
        <button
          type="button"
          onClick={() => setShowPoolForm(true)}
          className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          + Sbírka na odměnu
        </button>
      ) : (
        <form onSubmit={handleCreatePool} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <h3 className="font-medium">Nová sbírka na odměnu</h3>
          <p className="text-xs text-zinc-500">Kdo přispívá a na co se domluvte doopravdy — tady jen zapíšeš výsledek.</p>
          <select
            value={poolRewardId}
            onChange={(e) => setPoolRewardId(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-4 py-2"
          >
            <option value="">Vyber odměnu…</option>
            {rewards
              .filter((r) => r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.xpCost} XP)
                </option>
              ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => togglePoolInvitee(m.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  poolInvitees.includes(m.id) ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submittingPool}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Založit sbírku
            </button>
            <button
              type="button"
              onClick={() => setShowPoolForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-500">Přidat odměny z katalogu</h3>
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
                        alreadyAdded ? "border-border bg-surface-muted text-zinc-400" : "border-border bg-surface"
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
      </div>

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
          <h3 className="font-medium">Přidat odměnu</h3>
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
            <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
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
    </div>
  );
}
