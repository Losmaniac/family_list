"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { Coins } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import type { PooledContribution, Reward } from "@/lib/types";

/**
 * A "sbírka" (pooled contribution toward a shared reward, see
 * app/(dashboard)/shop/page.tsx) this member was invited to and hasn't
 * pledged toward yet — surfaced here on Today so it's actually noticed
 * (mirrors AppBadgeSync's poolsToPledge: invited, no pledge on record yet).
 */
export default function PendingPooledContributions({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [pools, setPools] = useState<PooledContribution[]>([]);
  const [rewards, setRewards] = useState<Record<string, Reward>>({});
  const [pledgeAmounts, setPledgeAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(getDb(), "families", familyId, "pooledContributions"), where("status", "==", "collecting"));
    return onSnapshot(q, (snap) => setPools(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PooledContribution)));
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "rewards"), (snap) => {
      const next: Record<string, Reward> = {};
      for (const d of snap.docs) next[d.id] = { id: d.id, ...d.data() } as Reward;
      setRewards(next);
    });
  }, [familyId]);

  async function handlePledge(pool: PooledContribution) {
    if (!user) return;
    const amount = Number(pledgeAmounts[pool.id]);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Zadej platné číslo XP.");
      return;
    }
    try {
      await updateDoc(doc(getDb(), "families", familyId, "pooledContributions", pool.id), {
        [`contributions.${user.uid}`]: amount,
      });
      toast.success("Příspěvek uložen.");
    } catch {
      toast.error("Příspěvek se nepodařilo uložit.");
    }
  }

  const actionable = user ? pools.filter((p) => p.invitedUserIds.includes(user.uid) && !(user.uid in p.contributions)) : [];
  if (actionable.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <Coins size={16} /> Sbírky čekající na tvůj příspěvek
      </h2>
      {actionable.map((pool) => {
        const reward = rewards[pool.rewardId];
        return (
          <div key={pool.id} className="flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <p className="font-medium">
              {reward?.title ?? pool.rewardId}
              {reward && <span className="ml-1 text-sm font-normal text-zinc-500">· cíl {formatXp(reward.xpCost)} XP</span>}
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                placeholder="Kolik XP dáš?"
                value={pledgeAmounts[pool.id] ?? ""}
                onChange={(e) => setPledgeAmounts((prev) => ({ ...prev, [pool.id]: e.target.value }))}
                className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => handlePledge(pool)}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
              >
                Přispět
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
