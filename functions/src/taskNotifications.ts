/**
 * Push notifications for the moments in a task's approval loop that matter
 * most for closing it: a child submits (parents should know something's
 * waiting), and a parent approves or returns it (the child should know
 * right away, not just next time they happen to open the app). Purely
 * notification side-effects — XP itself is still only ever moved by
 * onTaskCompleted's reconciliation.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { sendToTokens } from "./notifyHelpers";
import type { DailyTask, Member, TaskTemplate } from "../../lib/types";

export const onTaskStatusNotify = onDocumentUpdated(
  "families/{familyId}/dailyTasks/{taskId}",
  async (event) => {
    const before = event.data?.before.data() as DailyTask | undefined;
    const after = event.data?.after.data() as DailyTask | undefined;
    if (!before || !after || before.status === after.status) return;

    const db = getFirestore();
    const familyRef = db.collection("families").doc(event.params.familyId);
    const templateSnap = await familyRef.collection("taskTemplates").doc(after.templateId).get();
    const template = templateSnap.data() as TaskTemplate | undefined;
    const taskTitle = template?.title ?? "Úkol";

    if (after.status === "submitted") {
      const parentsSnapshot = await familyRef.collection("members").where("role", "==", "parent").get();
      const assigneeSnap = await familyRef.collection("members").doc(after.assignedTo).get();
      const assigneeName = (assigneeSnap.data() as Member | undefined)?.name ?? "Někdo";
      const tokens = parentsSnapshot.docs
        .map((d) => (d.data() as Member).fcmToken)
        .filter((token): token is string => Boolean(token));
      if (tokens.length > 0) {
        await sendToTokens(tokens, "Family Quest", `${assigneeName} odeslal(a) „${taskTitle}“ ke schválení.`);
      }
      return;
    }

    if (before.status === "submitted" && (after.status === "done" || after.status === "returned")) {
      const assigneeSnap = await familyRef.collection("members").doc(after.assignedTo).get();
      const token = (assigneeSnap.data() as Member | undefined)?.fcmToken;
      if (!token) return;
      if (after.status === "done") {
        await sendToTokens([token], "Family Quest", `„${taskTitle}“ bylo schváleno! +${template?.xpValue ?? 0} XP`);
      } else {
        await sendToTokens(
          [token],
          "Family Quest",
          after.returnComment ? `„${taskTitle}“ bylo vráceno: ${after.returnComment}` : `„${taskTitle}“ bylo vráceno.`
        );
      }
    }
  }
);
