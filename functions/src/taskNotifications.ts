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
import { notifyMembers } from "./notifyHelpers";
import type { DailyTask, Member, TaskTemplate } from "../../lib/types";

export const onTaskStatusNotify = onDocumentUpdated(
  "families/{familyId}/dailyTasks/{taskId}",
  async (event) => {
    const before = event.data?.before.data() as DailyTask | undefined;
    const after = event.data?.after.data() as DailyTask | undefined;
    if (!before || !after || before.status === after.status) return;

    const db = getFirestore();
    const familyId = event.params.familyId;
    const familyRef = db.collection("families").doc(familyId);
    const templateSnap = await familyRef.collection("taskTemplates").doc(after.templateId).get();
    const template = templateSnap.data() as TaskTemplate | undefined;
    const taskTitle = template?.title ?? "Úkol";

    if (after.status === "submitted") {
      const parentsSnapshot = await familyRef.collection("members").where("role", "==", "parent").get();
      const assigneeSnap = await familyRef.collection("members").doc(after.assignedTo).get();
      const assigneeName = (assigneeSnap.data() as Member | undefined)?.name ?? "Někdo";
      const targets = parentsSnapshot.docs.map((d) => ({ userId: d.id, fcmToken: (d.data() as Member).fcmToken }));
      await notifyMembers(familyId, targets, "Family Quest", `${assigneeName} odeslal(a) „${taskTitle}“ ke schválení.`, db);
      return;
    }

    if (before.status === "submitted" && (after.status === "done" || after.status === "returned")) {
      const assigneeSnap = await familyRef.collection("members").doc(after.assignedTo).get();
      const assignee = assigneeSnap.data() as Member | undefined;
      if (!assignee) return;
      const target = [{ userId: after.assignedTo, fcmToken: assignee.fcmToken }];
      if (after.status === "done") {
        await notifyMembers(familyId, target, "Family Quest", `„${taskTitle}“ bylo schváleno! +${template?.xpValue ?? 0} XP`, db);
      } else {
        await notifyMembers(
          familyId,
          target,
          "Family Quest",
          after.returnComment ? `„${taskTitle}“ bylo vráceno: ${after.returnComment}` : `„${taskTitle}“ bylo vráceno.`,
          db
        );
      }
    }
  }
);
