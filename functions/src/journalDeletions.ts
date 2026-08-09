/**
 * Deleting a journal (and all its entries) or a single entry always goes
 * through a JournalDeletionRequest, same second-parent-approval shape as
 * xpAdjustments.ts: auto-approved on creation if the family has no second
 * parent who could ever approve it, otherwise a *different* parent must
 * confirm (Firestore rules already enforce that). The actual delete only
 * ever happens here, via the Admin SDK — journals/journalEntries have no
 * client-writable delete rule at all anymore.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { xpAdjustmentNeedsApproval } from "../../lib/xp-engine";
import type { JournalDeletionRequest } from "../../lib/types";

export const onJournalDeletionRequestWritten = onDocumentWritten(
  "families/{familyId}/journalDeletionRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data() as JournalDeletionRequest | undefined;
    const after = event.data?.after.data() as JournalDeletionRequest | undefined;
    if (!after) return;

    const { familyId, requestId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const requestRef = familyRef.collection("journalDeletionRequests").doc(requestId);

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

    if (after.targetType === "journal") {
      const journalRef = familyRef.collection("journals").doc(after.targetId);
      const entriesSnap = await familyRef.collection("journalEntries").where("journalId", "==", after.targetId).get();
      const batch = db.batch();
      batch.delete(journalRef);
      for (const entryDoc of entriesSnap.docs) batch.delete(entryDoc.ref);
      await batch.commit();
    } else {
      await familyRef.collection("journalEntries").doc(after.targetId).delete();
    }
  }
);
