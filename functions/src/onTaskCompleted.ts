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
 *
 * reconcileTaskXp is intentionally idempotent and self-contained: it looks
 * only at a task's *current* state (status vs xpAwarded), never at what
 * triggered the call. That's what lets the same function serve both the
 * live onDocumentUpdated trigger and reconcileTaskXpSweep below — Firestore
 * document-change events are only "at least once, mostly in order", and
 * under rapid successive writes (a user tapping fast) or mid-deploy
 * (Eventarc briefly reconnecting to the new revision) individual events can
 * simply never arrive. A trigger alone can't recover from an event it never
 * received; only a periodic sweep that re-derives "should this be awarded"
 * from scratch can.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { applyStreakBonus, buildLedgerEntry } from "../../lib/xp-engine";
import { dateKeyInFamilyZone } from "../../lib/date-utils";
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

async function reconcileTaskXp(db: Firestore, familyId: string, taskId: string): Promise<void> {
  const familyRef = db.collection("families").doc(familyId);
  const taskRef = familyRef.collection("dailyTasks").doc(taskId);

  await db.runTransaction(async (tx) => {
    const taskSnap = await tx.get(taskRef);
    const task = taskSnap.data() as DailyTask | undefined;
    if (!task) return;

    const needsAward = task.status === "done" && !task.xpAwarded;
    const needsRevert = task.status !== "done" && task.xpAwarded;
    if (!needsAward && !needsRevert) return;

    const memberRef = familyRef.collection("members").doc(task.assignedTo);
    const memberSnap = await tx.get(memberRef);
    const member = memberSnap.data() as Member | undefined;

    if (needsAward) {
      const templateSnap = await tx.get(familyRef.collection("taskTemplates").doc(task.templateId));
      const template = templateSnap.data() as TaskTemplate | undefined;
      if (!template) return;

      const { streak, freezeWeek } = computeStreak(member, task.date);
      const delta = applyStreakBonus(template.xpValue, streak);
      const longestStreak = Math.max(member?.longestStreak ?? 0, streak);

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({ userId: task.assignedTo, delta, reason: "task_completed", relatedTaskId: taskId })
      );
      tx.update(memberRef, {
        xpBalance: FieldValue.increment(delta),
        currentStreak: streak,
        longestStreak,
        lastActiveDate: task.date,
        streakFreezeWeek: freezeWeek,
      });
      tx.update(taskRef, { xpAwarded: delta });
    } else {
      const awarded = task.xpAwarded as number;
      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({ userId: task.assignedTo, delta: -awarded, reason: "task_reverted", relatedTaskId: taskId })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(-awarded) });
      tx.update(taskRef, { xpAwarded: FieldValue.delete() });
    }
  });
}

export const onTaskCompleted = onDocumentUpdated(
  "families/{familyId}/dailyTasks/{taskId}",
  async (event) => {
    const before = event.data?.before.data() as DailyTask | undefined;
    const after = event.data?.after.data() as DailyTask | undefined;
    if (!before || !after || before.status === after.status) return;
    if (before.status !== "done" && after.status !== "done") return;

    const { familyId, taskId } = event.params;
    await reconcileTaskXp(getFirestore(), familyId, taskId);
  }
);

/**
 * Safety net for the event-loss scenario described above: sweeps every
 * family's today/yesterday dailyTasks and reconciles any that are
 * 'done' with no xpAwarded (a missed award) or not 'done' with an
 * xpAwarded left over (a missed revert). Scoped to the last two days —
 * older mismatches shouldn't occur once this runs hourly, and scanning
 * a family's entire task history every run isn't worth the read cost.
 */
export const reconcileTaskXpSweep = onSchedule({ schedule: "0 * * * *", timeZone: "Europe/Prague" }, async () => {
  const db = getFirestore();
  const now = new Date();
  const today = dateKeyInFamilyZone(now);
  const yesterday = dateKeyInFamilyZone(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const familiesSnapshot = await db.collection("families").get();
  for (const familyDoc of familiesSnapshot.docs) {
    const tasksSnapshot = await familyDoc.ref.collection("dailyTasks").where("date", "in", [today, yesterday]).get();

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data() as DailyTask;
      const needsAward = task.status === "done" && !task.xpAwarded;
      const needsRevert = task.status !== "done" && task.xpAwarded;
      if (needsAward || needsRevert) {
        await reconcileTaskXp(db, familyDoc.id, taskDoc.id);
      }
    }
  }
});
