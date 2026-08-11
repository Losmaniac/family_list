/**
 * Awards XP when a parent flips a 'pending' ad-hoc completion (a
 * photoRequired type's submission — see functions/src/adHocTasks.ts) to
 * 'approved' — the client only ever writes that status transition directly
 * (firestore.rules), this trigger is what actually moves XP, same
 * "never trust the client with XP" split as onTaskCompleted.ts's
 * submitted->done approval for regular tasks. Idempotent against Firestore's
 * at-least-once trigger delivery: re-checks the live completion doc inside
 * the transaction and no-ops if xpAwarded is already set.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import type { AdHocTaskCompletion, AdHocTaskType } from "../../lib/types";

export const onAdHocCompletionDecided = onDocumentUpdated(
  "families/{familyId}/adHocCompletions/{completionId}",
  async (event) => {
    const before = event.data?.before.data() as AdHocTaskCompletion | undefined;
    const after = event.data?.after.data() as AdHocTaskCompletion | undefined;
    if (!before || !after || before.status !== "pending" || after.status !== "approved") return;

    const { familyId, completionId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const completionRef = familyRef.collection("adHocCompletions").doc(completionId);
    const typeRef = familyRef.collection("adHocTaskTypes").doc(after.typeId);
    const memberRef = familyRef.collection("members").doc(after.completedBy);

    await db.runTransaction(async (tx) => {
      const [completionSnap, typeSnap] = await Promise.all([tx.get(completionRef), tx.get(typeRef)]);
      const completion = completionSnap.data() as AdHocTaskCompletion | undefined;
      const type = typeSnap.data() as AdHocTaskType | undefined;
      if (!completion || completion.status !== "approved" || completion.xpAwarded > 0 || !type) return;

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({ userId: after.completedBy, delta: type.xpValue, reason: "adhoc_task", relatedTaskId: after.typeId })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(type.xpValue) });
      tx.update(completionRef, { xpAwarded: type.xpValue });
    });
  }
);
