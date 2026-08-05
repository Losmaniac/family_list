/**
 * A parent can grant or dock XP for any member as a one-off adjustment.
 * Firestore rules already block a requester from approving their own
 * request — this handles the rest: auto-approving on creation if the family
 * has no second parent who could ever approve it (so a single-parent family
 * isn't stuck waiting on someone who doesn't exist), and awarding the XP the
 * moment a request becomes 'approved', whichever path got it there.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry, xpAdjustmentNeedsApproval } from "../../lib/xp-engine";
import type { XpAdjustmentRequest } from "../../lib/types";

export const onXpAdjustmentRequestWritten = onDocumentWritten(
  "families/{familyId}/xpAdjustmentRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data() as XpAdjustmentRequest | undefined;
    const after = event.data?.after.data() as XpAdjustmentRequest | undefined;
    if (!after) return;

    const { familyId, requestId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const requestRef = familyRef.collection("xpAdjustmentRequests").doc(requestId);

    if (!before && after.status === "requested") {
      const parentsSnapshot = await familyRef.collection("members").where("role", "==", "parent").get();
      if (!xpAdjustmentNeedsApproval(parentsSnapshot.size)) {
        await requestRef.update({ status: "approved" });
      }
      return;
    }

    // Just became approved — either a second parent decided it, or the
    // auto-approve above re-triggered this same function via its own write.
    if (before?.status === "approved" || after.status !== "approved") return;

    const memberRef = familyRef.collection("members").doc(after.targetUserId);
    await db.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) return;

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({
          userId: after.targetUserId,
          delta: after.delta,
          reason: "manual_adjustment",
          note: after.reason,
        })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(after.delta) });
    });
  }
);
