/**
 * Awards/revokes XP when a dailyTask's status crosses into or out of 'done'.
 * 'done' is only ever reached via a parent action — either approving a
 * child's 'submitted' task, or a parent/adult completing their own task
 * directly (self-approved) — so this trigger doesn't need to know which path
 * got it there, only that it did. This is the only place xpBalance ever
 * changes — it always goes through a xpLedger write in the same
 * transaction, per the "never trust the client" XP principle. Streak
 * tracking (with a once-a-week freeze so one skipped day doesn't reset it)
 * and the streak XP bonus live here too, alongside the award, so they can
 * never drift out of sync with it.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { applyStreakBonus, buildLedgerEntry } from "../../lib/xp-engine";
import type { DailyTask, Member, TaskTemplate } from "../../lib/types";

function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function mondayKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - mondayOffset);
  return d.toISOString().slice(0, 10);
}

interface StreakResult {
  streak: number;
  freezeWeek: string | null;
}

function computeStreak(
  member: Pick<Member, "currentStreak" | "lastActiveDate" | "streakFreezeWeek"> | undefined,
  date: string
): StreakResult {
  const currentStreak = member?.currentStreak ?? 0;
  const freezeWeek = member?.streakFreezeWeek ?? null;

  if (member?.lastActiveDate === date) return { streak: currentStreak, freezeWeek };
  if (member?.lastActiveDate === previousDate(date)) return { streak: currentStreak + 1, freezeWeek };

  const oneDaySkipped = member?.lastActiveDate === previousDate(previousDate(date));
  const week = mondayKey(date);
  if (oneDaySkipped && currentStreak > 0 && freezeWeek !== week) {
    return { streak: currentStreak + 1, freezeWeek: week };
  }

  return { streak: 1, freezeWeek };
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

      await db.runTransaction(async (tx) => {
        const memberSnap = await tx.get(memberRef);
        const member = memberSnap.data() as Member | undefined;
        const { streak, freezeWeek } = computeStreak(member, after.date);
        const delta = applyStreakBonus(template.xpValue, streak);
        const longestStreak = Math.max(member?.longestStreak ?? 0, streak);

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
          currentStreak: streak,
          longestStreak,
          lastActiveDate: after.date,
          streakFreezeWeek: freezeWeek,
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
