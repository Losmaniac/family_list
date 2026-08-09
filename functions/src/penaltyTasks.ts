/**
 * "Postihové úkoly" — a parent-issued deadline with automatic XP loss if
 * ignored (e.g. "clean your room, I've told you three times"): miss the
 * deadline and every assigned member loses `penaltyXp`, then keeps losing
 * `recurringXp` every further `recurringIntervalHours` until a parent
 * resolves it. This sweep is the only place that ever applies the
 * deduction — the client only ever computes what it *would* be, for
 * display, from the same pure lib/penalty-tasks.ts helpers. Resolving a
 * task (stopping the deduction) is never done here — a parent updating
 * penaltyTasks/{id}.status directly is enough, no server code needed for
 * that side.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { computePendingPenalty } from "../../lib/penalty-tasks";
import type { PenaltyTask } from "../../lib/types";

export const penaltyTaskSweep = onSchedule({ schedule: "*/15 * * * *", timeZone: "Europe/Prague" }, async () => {
  const db = getFirestore();
  const familiesSnapshot = await db.collection("families").get();

  for (const familyDoc of familiesSnapshot.docs) {
    const pendingSnapshot = await familyDoc.ref.collection("penaltyTasks").where("status", "==", "pending").get();

    for (const taskDoc of pendingSnapshot.docs) {
      const task = taskDoc.data() as PenaltyTask;
      if (computePendingPenalty(task).unitsToApply === 0) continue;

      await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(taskDoc.ref);
        const fresh = freshSnap.data() as PenaltyTask | undefined;
        if (!fresh || fresh.status !== "pending") return;

        const due = computePendingPenalty(fresh);
        if (due.unitsToApply === 0) return;

        for (const memberId of fresh.assignedTo) {
          tx.set(
            familyDoc.ref.collection("xpLedger").doc(),
            buildLedgerEntry({
              userId: memberId,
              delta: -due.xpToDeduct,
              reason: "penalty_task",
              relatedTaskId: taskDoc.id,
            })
          );
          tx.update(familyDoc.ref.collection("members").doc(memberId), {
            xpBalance: FieldValue.increment(-due.xpToDeduct),
          });
        }
        tx.update(taskDoc.ref, { penaltiesApplied: fresh.penaltiesApplied + due.unitsToApply });
      });
    }
  }
});
