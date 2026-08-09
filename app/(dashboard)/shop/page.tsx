"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatXp } from "@/lib/xp-engine";
import RewardShop from "@/components/RewardShop";
import SavingsProgress from "@/components/SavingsProgress";
import type { Member, PooledContribution, Reward, RewardRedemption, RewardRedemptionStatus } from "@/lib/types";

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
  const toast = useToast();
  const { confirm } = useDialog();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<RewardRedemption[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [pools, setPools] = useState<PooledContribution[]>([]);
  const [pledgeAmounts, setPledgeAmounts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "rewards"), (snapshot) => {
      setRewards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Reward));
      setLoaded(true);
    });
  }, [familyId]);

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
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const poolsQuery = query(
      collection(getDb(), "families", familyId, "pooledContributions"),
      where("status", "==", "collecting")
    );
    return onSnapshot(poolsQuery, (snapshot) => {
      setPools(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PooledContribution));
    });
  }, [familyId]);

  async function handleToggleGoal(reward: Reward) {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        savingsGoalRewardId: member?.savingsGoalRewardId === reward.id ? null : reward.id,
      });
    } catch {
      toast.error("Cíl se nepodařilo nastavit.");
    }
  }

  async function handleClearGoal() {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), { savingsGoalRewardId: null });
    } catch {
      toast.error("Cíl se nepodařilo zrušit.");
    }
  }

  async function handleRedeem(reward: Reward) {
    if (!familyId || !user) return;
    try {
      await addDoc(collection(getDb(), "families", familyId, "rewardRedemptions"), {
        userId: user.uid,
        rewardId: reward.id,
        status: reward.approvalRequired ? "requested" : "approved",
        timestamp: Date.now(),
      });
      toast.success(reward.approvalRequired ? "Odměna vyžádána." : "Odměna uplatněna.");
    } catch {
      toast.error("Odměnu se nepodařilo uplatnit.");
    }
  }

  async function handleDeleteRedemption(redemption: RewardRedemption) {
    if (!familyId) return;
    const reward = rewards.find((r) => r.id === redemption.rewardId);
    const ok = await confirm({
      title: `Smazat „${reward?.title ?? redemption.rewardId}“ z historie?`,
      description: "Tuto akci nelze vrátit zpět. Případně už odečtené XP se tím nevrátí.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "rewardRedemptions", redemption.id));
      toast.success("Odměna byla smazána z historie.");
    } catch {
      toast.error("Nepodařilo se smazat.");
    }
  }

  async function handlePledge(pool: PooledContribution) {
    if (!familyId || !user) return;
    const amount = Number(pledgeAmounts[pool.id]);
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "pooledContributions", pool.id), {
        [`contributions.${user.uid}`]: amount,
      });
      toast.success("Příspěvek uložen.");
    } catch {
      toast.error("Příspěvek se nepodařilo uložit.");
    }
  }

  if (loaded && rewards.length === 0 && pools.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-11rem)] flex-col items-center justify-center gap-3 text-center text-zinc-500">
        <ShoppingBag size={40} />
        <p className="text-lg text-foreground">Obchod je zatím prázdný.</p>
        {member?.role === "parent" ? (
          <>
            <p className="max-w-xs text-sm">Přidej první odměny v Nastavení → Obchod.</p>
            <Link href="/settings" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
              Otevřít Nastavení
            </Link>
          </>
        ) : (
          <p className="max-w-xs text-sm">Rodiče ještě nepřidali žádné odměny.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">XP obchod</h1>

      {rewards.length > 0 && (
        <RewardShop
          rewards={rewards}
          xpBalance={member?.xpBalance ?? 0}
          onRedeem={handleRedeem}
          goalRewardId={member?.savingsGoalRewardId}
          onToggleGoal={handleToggleGoal}
        />
      )}

      <SavingsProgress
        rewards={rewards}
        xpBalance={member?.xpBalance ?? 0}
        goalReward={rewards.find((r) => r.id === member?.savingsGoalRewardId)}
        onClearGoal={handleClearGoal}
      />

      {myRedemptions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Moje odměny</h2>
          {myRedemptions.map((redemption) => {
            const reward = rewards.find((r) => r.id === redemption.rewardId);
            return (
              <div key={redemption.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <p className="font-medium">{reward?.title ?? redemption.rewardId}</p>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${STATUS_COLORS[redemption.status]}`}>
                    {STATUS_LABELS[redemption.status]}
                  </span>
                  {member?.role === "parent" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRedemption(redemption)}
                      aria-label="Smazat z historie"
                      className="text-zinc-400 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {pools.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Sbírky na odměnu</h2>
          {pools.map((pool) => {
            const reward = rewards.find((r) => r.id === pool.rewardId);
            const total = Object.values(pool.contributions).reduce((sum, v) => sum + v, 0);
            const progress = reward ? Math.min(100, Math.round((total / reward.xpCost) * 100)) : 0;
            const myPledge = user ? pool.contributions[user.uid] : undefined;
            const iAmInvited = user ? pool.invitedUserIds.includes(user.uid) : false;
            return (
              <div key={pool.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{reward?.title ?? pool.rewardId}</p>
                  <p className="text-zinc-500">
                    {formatXp(total)}/{reward ? formatXp(reward.xpCost) : "?"} XP
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-zinc-500">
                  {pool.invitedUserIds.map((userId) => {
                    const pledge = pool.contributions[userId];
                    return (
                      <span key={userId} className="rounded-full bg-surface-muted px-2 py-0.5">
                        {members[userId]?.name ?? userId}: {pledge !== undefined ? `${formatXp(pledge)} XP` : "čeká"}
                      </span>
                    );
                  })}
                </div>
                {iAmInvited && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder={myPledge !== undefined ? String(myPledge) : "Kolik XP dáš?"}
                      value={pledgeAmounts[pool.id] ?? ""}
                      onChange={(e) => setPledgeAmounts((prev) => ({ ...prev, [pool.id]: e.target.value }))}
                      className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handlePledge(pool)}
                      className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                    >
                      {myPledge !== undefined ? "Upravit" : "Přispět"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
