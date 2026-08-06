/**
 * Any family member — including a child — can propose a new task with a
 * suggested XP value. It only becomes a real, active taskTemplate once
 * every *other* member has approved it (unanimous — a task everyone lives
 * with should have everyone's buy-in, and for a request-linked proposal
 * this naturally includes the requester); any single rejection kills it.
 * Firestore rules already stop the proposer from voting on their own
 * proposal and stop anyone from adding someone else's uid to `approvals` —
 * this just watches for "everyone else has approved" and does the
 * conversion, which needs the Admin SDK since taskTemplates writes are
 * parent-only in rules.
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
    if (!after || after.status !== "pending") return;

    const { familyId, proposalId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);

    const membersSnapshot = await familyRef.collection("members").get();
    const otherMemberCount = membersSnapshot.size - 1;
    if (otherMemberCount <= 0 || after.approvals.length < otherMemberCount) return;

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
