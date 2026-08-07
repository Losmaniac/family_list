"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import type { PooledContribution, TaskProposal, XpAdjustmentRequest } from "@/lib/types";

interface BadgeCounts {
  returnedTasks: number;
  proposalsToVote: number;
  poolsToPledge: number;
  submittedTasks: number;
  xpAdjustments: number;
  redemptions: number;
}

const ZERO_COUNTS: BadgeCounts = {
  returnedTasks: 0,
  proposalsToVote: 0,
  poolsToPledge: 0,
  submittedTasks: 0,
  xpAdjustments: 0,
  redemptions: 0,
};

/**
 * iOS 16.4+ (and Chromium) support the Badging API for an installed PWA —
 * the small red count on the home-screen icon. Mirrors the same "needs your
 * attention" items already surfaced in-app (Čeká na schválení, Návrhy
 * úkolů, sbírky, ...) so the badge means something without opening the app.
 * No-ops entirely where the API isn't available (nothing calls it).
 */
export default function AppBadgeSync() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const [counts, setCounts] = useState<BadgeCounts>(ZERO_COUNTS);

  useEffect(() => {
    if (!familyId || !user) return;
    const q = query(
      collection(getDb(), "families", familyId, "dailyTasks"),
      where("assignedTo", "==", user.uid),
      where("status", "==", "returned")
    );
    return onSnapshot(q, (snap) => setCounts((c) => ({ ...c, returnedTasks: snap.size })));
  }, [familyId, user]);

  useEffect(() => {
    if (!familyId || !user) return;
    const q = query(collection(getDb(), "families", familyId, "taskProposals"), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => {
        const p = d.data() as TaskProposal;
        return p.proposedBy !== user.uid && !p.approvals.includes(user.uid);
      }).length;
      setCounts((c) => ({ ...c, proposalsToVote: count }));
    });
  }, [familyId, user]);

  useEffect(() => {
    if (!familyId || !user) return;
    const q = query(collection(getDb(), "families", familyId, "pooledContributions"), where("status", "==", "collecting"));
    return onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => {
        const p = d.data() as PooledContribution;
        return p.invitedUserIds.includes(user.uid) && !(user.uid in p.contributions);
      }).length;
      setCounts((c) => ({ ...c, poolsToPledge: count }));
    });
  }, [familyId, user]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    const q = query(collection(getDb(), "families", familyId, "dailyTasks"), where("status", "==", "submitted"));
    return onSnapshot(q, (snap) => setCounts((c) => ({ ...c, submittedTasks: snap.size })));
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent" || !user) return;
    const q = query(collection(getDb(), "families", familyId, "xpAdjustmentRequests"), where("status", "==", "requested"));
    return onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => (d.data() as XpAdjustmentRequest).requestedBy !== user.uid).length;
      setCounts((c) => ({ ...c, xpAdjustments: count }));
    });
  }, [familyId, member?.role, user]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    const q = query(
      collection(getDb(), "families", familyId, "rewardRedemptions"),
      where("status", "in", ["requested", "approved"])
    );
    return onSnapshot(q, (snap) => setCounts((c) => ({ ...c, redemptions: snap.size })));
  }, [familyId, member?.role]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (total > 0) {
      nav.setAppBadge?.(total).catch(() => {});
    } else {
      nav.clearAppBadge?.().catch(() => {});
    }
  }, [counts]);

  return null;
}
