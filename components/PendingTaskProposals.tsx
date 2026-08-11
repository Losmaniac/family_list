"use client";

import { useEffect, useState } from "react";
import { arrayUnion, collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { ClipboardList } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { categoryInfo } from "@/lib/categories";
import { formatXp } from "@/lib/xp-engine";
import type { Member, TaskProposal } from "@/lib/types";

/**
 * A member-proposed new task ("Návrh úkolu", see app/(dashboard)/family/page.tsx)
 * needing this member's vote — surfaced here on Today, not just on Rodina,
 * since that's the one place every member actually checks daily (see
 * AppBadgeSync's proposalsToVote, which this mirrors: proposer excluded,
 * already-voted excluded). One non-proposer's approval is enough to adopt it.
 */
export default function PendingTaskProposals({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    const q = query(collection(getDb(), "families", familyId, "taskProposals"), where("status", "==", "pending"));
    return onSnapshot(q, (snap) => setProposals(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskProposal)));
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snap) => {
      const next: Record<string, Member> = {};
      for (const d of snap.docs) next[d.id] = { id: d.id, ...d.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  async function handleApprove(proposal: TaskProposal) {
    if (!user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskProposals", proposal.id), { approvals: arrayUnion(user.uid) });
    } catch {
      toast.error("Nepodařilo se uložit schválení.");
    }
  }

  async function handleReject(proposal: TaskProposal) {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "taskProposals", proposal.id), { status: "rejected" });
    } catch {
      toast.error("Nepodařilo se zamítnout návrh.");
    }
  }

  const actionable = user ? proposals.filter((p) => p.proposedBy !== user.uid && !p.approvals.includes(user.uid)) : [];
  if (actionable.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 font-medium">
        <ClipboardList size={16} /> Návrhy úkolů ke schválení
      </h2>
      {actionable.map((proposal) => {
        const proposer = members[proposal.proposedBy];
        const target = proposal.requestId ? members[proposal.assignedTo[0]] : null;
        return (
          <div key={proposal.id} className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {categoryInfo(proposal.category).icon} {proposal.title} · +{formatXp(proposal.xpValue)} XP
              </p>
              <p className="truncate text-sm text-zinc-500">
                Navrhl(a) {proposer?.name ?? proposal.proposedBy}
                {target && ` pro ${target.name}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleApprove(proposal)}
                className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
              >
                Schválit
              </button>
              <button
                type="button"
                onClick={() => handleReject(proposal)}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
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
