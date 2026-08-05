/**
 * A parent finalizes a pooled reward once the family has agreed (in person)
 * who's chipping in and everyone's pledged their share — this deducts each
 * contributor's pledge from their own balance. A contributor's balance may
 * have changed since they pledged (they could've spent XP elsewhere in the
 * meantime), so each deduction re-reads the live balance inside its own
 * transaction and skips that one contributor entirely rather than pushing
 * anyone negative.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import type { Member, PooledContribution, Reward } from "../../lib/types";

export const onPooledContributionWritten = onDocumentUpdated(
  "families/{familyId}/pooledContributions/{poolId}",
  async (event) => {
    const before = event.data?.before.data() as PooledContribution | undefined;
    const after = event.data?.after.data() as PooledContribution | undefined;
    if (!after || before?.status === "fulfilled" || after.status !== "fulfilled") return;

    const { familyId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);

    const rewardSnap = await familyRef.collection("rewards").doc(after.rewardId).get();
    const reward = rewardSnap.data() as Reward | undefined;

    for (const [userId, pledged] of Object.entries(after.contributions)) {
      if (!pledged || pledged <= 0) continue;
      const memberRef = familyRef.collection("members").doc(userId);

      await db.runTransaction(async (tx) => {
        const memberSnap = await tx.get(memberRef);
        const member = memberSnap.data() as Member | undefined;
        if (!member || member.xpBalance < pledged) return;

        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({
            userId,
            delta: -pledged,
            reason: "pooled_contribution",
            note: reward?.title,
          })
        );
        tx.update(memberRef, { xpBalance: FieldValue.increment(-pledged) });
      });
    }
  }
);
