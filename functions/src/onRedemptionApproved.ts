/**
 * Deducts XP the moment a rewardRedemption becomes 'approved' — whether that
 * happens immediately at creation (reward.approvalRequired === false) or via
 * a parent's later update from 'requested'. If the member can no longer
 * afford it (balance changed since the request), the redemption is bounced
 * back to 'rejected' instead of going negative.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry, canAffordReward } from "../../lib/xp-engine";
import type { Member, Reward, RewardRedemption } from "../../lib/types";

export const onRedemptionApproved = onDocumentWritten(
  "families/{familyId}/rewardRedemptions/{redemptionId}",
  async (event) => {
    const before = event.data?.before.data() as RewardRedemption | undefined;
    const after = event.data?.after.data() as RewardRedemption | undefined;
    if (!after || before?.status === "approved" || after.status !== "approved") return;

    const { familyId, redemptionId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const redemptionRef = familyRef.collection("rewardRedemptions").doc(redemptionId);
    const memberRef = familyRef.collection("members").doc(after.userId);

    const rewardSnap = await familyRef.collection("rewards").doc(after.rewardId).get();
    const reward = rewardSnap.data() as Reward | undefined;
    if (!reward) return;

    await db.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      const member = memberSnap.data() as Member | undefined;

      if (!member || !canAffordReward(member.xpBalance, reward.xpCost)) {
        tx.update(redemptionRef, { status: "rejected" });
        return;
      }

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({
          userId: after.userId,
          delta: -reward.xpCost,
          reason: "reward_redeemed",
        })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(-reward.xpCost) });
    });
  }
);
