/**
 * Awards/revokes XP when a dailyTask's status crosses into or out of 'done'.
 * This is the only place xpBalance ever changes — it always goes through a
 * xpLedger write in the same transaction, per the "never trust the client"
 * XP principle. Streak tracking (member.currentStreak/lastActiveDate) lives
 * here too, alongside the award, so it can never drift out of sync with it.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry, xpForTaskCompletion } from "../../lib/xp-engine";
import type { DailyTask, Member, TaskTemplate } from "../../lib/types";

function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextStreak(member: Pick<Member, "currentStreak" | "lastActiveDate"> | undefined, date: string): number {
  const currentStreak = member?.currentStreak ?? 0;
  if (member?.lastActiveDate === date) return currentStreak;
  if (member?.lastActiveDate === previousDate(date)) return currentStreak + 1;
  return 1;
}

export const onTaskCompleted = onDocumentUpdated(
  "families/{familyId}/dailyTasks/{taskId}",
  async (event) => {
    const before = event.data?.before.data() as DailyTask | undefined;
    const after = event.data?.after.data() as DailyTask | undefined;
    if (!before || !after || before.status === after.status) return;

    const { familyId, taskId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const taskRef = familyRef.collection("dailyTasks").doc(taskId);
    const memberRef = familyRef.collection("members").doc(after.assignedTo);

    if (before.status !== "done" && after.status === "done") {
      const templateSnap = await familyRef.collection("taskTemplates").doc(after.templateId).get();
      const template = templateSnap.data() as TaskTemplate | undefined;
      if (!template) return;

      const delta = xpForTaskCompletion(template.xpValue);

      await db.runTransaction(async (tx) => {
        const memberSnap = await tx.get(memberRef);
        const member = memberSnap.data() as Member | undefined;

        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({
            userId: after.assignedTo,
            delta,
            reason: "task_completed",
            relatedTaskId: taskId,
          })
        );
        tx.update(memberRef, {
          xpBalance: FieldValue.increment(delta),
          currentStreak: nextStreak(member, after.date),
          lastActiveDate: after.date,
        });
        tx.update(taskRef, { xpAwarded: delta });
      });
    } else if (before.status === "done" && after.status !== "done") {
      const awarded = before.xpAwarded;
      if (!awarded) return;

      await db.runTransaction(async (tx) => {
        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({
            userId: after.assignedTo,
            delta: -awarded,
            reason: "task_reverted",
            relatedTaskId: taskId,
          })
        );
        tx.update(memberRef, { xpBalance: FieldValue.increment(-awarded) });
        tx.update(taskRef, { xpAwarded: FieldValue.delete() });
      });
    }
  }
);
