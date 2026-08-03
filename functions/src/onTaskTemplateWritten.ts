/**
 * A parent creating/editing a taskTemplate on /assign shouldn't have to wait
 * for the next 00:05 cron run to see it show up on /today — if the template
 * is due today, generate today's dailyTask for each assignee right away.
 * Idempotent: skips any assignee who already has a dailyTask for today (e.g.
 * one dailyTaskGenerator already created, or one the user already checked
 * off), so this never clobbers existing state.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { dailyTaskId, isDue } from "../../lib/task-scheduler";
import type { TaskTemplate } from "../../lib/types";

export const onTaskTemplateWritten = onDocumentWritten(
  "families/{familyId}/taskTemplates/{templateId}",
  async (event) => {
    const after = event.data?.after.data() as TaskTemplate | undefined;
    if (!after) return;

    const now = new Date();
    if (!isDue(after, now)) return;

    const { familyId, templateId } = event.params;
    const dateKey = now.toISOString().slice(0, 10);
    const db = getFirestore();
    const dailyTasksRef = db.collection("families").doc(familyId).collection("dailyTasks");

    const batch = db.batch();
    let hasWrites = false;

    for (const userId of after.assignedTo) {
      const ref = dailyTasksRef.doc(dailyTaskId(dateKey, templateId, userId));
      const existing = await ref.get();
      if (existing.exists) continue;

      batch.set(ref, {
        templateId,
        assignedTo: userId,
        date: dateKey,
        status: "pending",
      });
      hasWrites = true;
    }

    if (hasWrites) await batch.commit();
  }
);
