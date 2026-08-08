/**
 * Any family member — including a child — can propose a new task with a
 * suggested XP value. It becomes a real, active taskTemplate as soon as a
 * single parent has approved it (a parent's sign-off is enough on its
 * own — no need to round up everyone else's buy-in too); any single
 * rejection kills it. Firestore rules already stop the proposer from
 * voting on their own proposal and stop anyone from adding someone else's
 * uid to `approvals` — this just watches for "a parent is among the
 * approvals" and does the conversion, which needs the Admin SDK since
 * taskTemplates writes are parent-only in rules.
 *
 * When the winning proposal is a response to a TaskRequest, this also
 * marks that request 'fulfilled' and auto-rejects any other still-pending
 * proposal for the same request — once one wins, the rest are moot.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import type { TaskProposal } from "../../lib/types";

export const onTaskProposalWritten = onDocumentWritten(
  "families/{familyId}/taskProposals/{proposalId}",
  async (event) => {
    const after = event.data?.after.data() as TaskProposal | undefined;
    if (!after || after.status !== "pending" || after.approvals.length === 0) return;

    const { familyId, proposalId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);

    const membersSnapshot = await familyRef.collection("members").get();
    const parentIds = new Set(
      membersSnapshot.docs.filter((d) => d.data().role === "parent").map((d) => d.id)
    );
    const hasParentApproval = after.approvals.some((uid) => parentIds.has(uid));
    if (!hasParentApproval) return;

    const proposalRef = familyRef.collection("taskProposals").doc(proposalId);
    const batch = db.batch();
    batch.set(familyRef.collection("taskTemplates").doc(), {
      title: after.title,
      description: after.description ?? "",
      category: after.category,
      xpValue: after.xpValue,
      recurrence: after.recurrence,
      assignedTo: after.assignedTo,
      daysOfWeek: after.daysOfWeek,
      date: after.date ?? null,
      dayOfMonth: after.dayOfMonth ?? null,
      active: true,
    });
    batch.update(proposalRef, { status: "approved" });

    if (after.requestId) {
      batch.update(familyRef.collection("taskRequests").doc(after.requestId), { status: "fulfilled" });

      const rivalProposals = await familyRef
        .collection("taskProposals")
        .where("requestId", "==", after.requestId)
        .where("status", "==", "pending")
        .get();
      for (const rival of rivalProposals.docs) {
        if (rival.id === proposalId) continue;
        batch.update(rival.ref, { status: "rejected" });
      }
    }

    await batch.commit();
  }
);
