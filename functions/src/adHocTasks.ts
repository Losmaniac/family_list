/**
 * "Jednorázové úkoly" (ad-hoc tasks) — irregular chores that don't fit a
 * daily/weekly recurrence (e.g. emptying the dishwasher): a parent defines
 * the type (title, XP, cooldown) in Settings, and any family member can mark
 * one done on demand from /today. Awarding XP and enforcing the cooldown
 * both happen here, server-side — the client only ever reads adHocCompletions
 * (read-only except for a parent's approve/reject, same trust tier as
 * xpLedger) to render its countdown, never decides for itself whether
 * enough time has passed.
 *
 * A type with photoRequired doesn't award XP here at all when the photo
 * gate is actually active — the photo is evidence a parent still needs to
 * actually look at, so the completion is written 'pending' with no XP, and
 * functions/src/onAdHocCompletionDecided.ts awards it once a parent
 * approves (see PendingAdHocApprovals.tsx). The gate never applies to a
 * parent completing their own task (photo is optional, never required),
 * and doesn't apply to a child past family.photoExemptFromLevel either —
 * both stay self-service and instant, same as a type with no photo
 * requirement at all.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { buildLedgerEntry, levelForXp } from "../../lib/xp-engine";
import { adHocCooldownInfo, formatCooldownRemaining } from "../../lib/adhoc-tasks";
import { requireAuth, requireFamilyMember } from "./practice";
import type { AdHocTaskType, Family, Member } from "../../lib/types";

interface CompleteRequest {
  familyId: string;
  typeId: string;
  /** Required when the type's photoRequired is set — uploaded client-side before this call, same trust model as taskTemplates.photoRequired. */
  photoUrl?: string;
}

export const completeAdHocTask = onCall<CompleteRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, typeId, photoUrl } = request.data;
  if (!familyId || !typeId) throw new HttpsError("invalid-argument", "familyId and typeId are required.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const typeRef = familyRef.collection("adHocTaskTypes").doc(typeId);
  const memberRef = familyRef.collection("members").doc(uid);
  const lastCompletionQuery = familyRef
    .collection("adHocCompletions")
    .where("typeId", "==", typeId)
    .orderBy("timestamp", "desc")
    .limit(1);

  const { awarded, pending } = await db.runTransaction(async (tx) => {
    const [typeSnap, lastSnap, familySnap, memberSnap] = await Promise.all([
      tx.get(typeRef),
      tx.get(lastCompletionQuery),
      tx.get(familyRef),
      tx.get(memberRef),
    ]);
    const type = typeSnap.data() as AdHocTaskType | undefined;
    if (!type || !type.active) throw new HttpsError("failed-precondition", "Tento úkol už není dostupný.");

    const family = familySnap.data() as Family | undefined;
    const member = memberSnap.data() as Member | undefined;

    // A parent is never gated on the photo — Settings' photoExemptFromLevel
    // is a level a *child* can grow into, but a parent doesn't need proof
    // at all. Either way, skipping the photo also skips the pending-
    // approval flow below: there's nothing left for another parent to
    // review, so it's treated exactly like a non-photoRequired type.
    const exemptFromLevel = family?.photoExemptFromLevel;
    const memberLevel = levelForXp(member?.xpBalance ?? 0, family?.levelThresholds);
    const isExemptChild = exemptFromLevel !== undefined && memberLevel >= exemptFromLevel;
    const photoGateActive = type.photoRequired && member?.role !== "parent" && !isExemptChild;
    if (photoGateActive && !photoUrl) throw new HttpsError("invalid-argument", "Tento úkol vyžaduje foto.");

    const lastCompletedAt = lastSnap.empty ? undefined : (lastSnap.docs[0].data().timestamp as number);
    const cooldown = adHocCooldownInfo(type.cooldownMinutes, lastCompletedAt);
    if (cooldown.onCooldown) {
      throw new HttpsError(
        "failed-precondition",
        `Ještě chvíli počkej — zbývá ${formatCooldownRemaining(cooldown.remainingMs)}.`
      );
    }

    if (photoGateActive) {
      tx.set(familyRef.collection("adHocCompletions").doc(), {
        typeId,
        completedBy: uid,
        timestamp: Date.now(),
        xpAwarded: 0,
        status: "pending",
        photoUrl,
      });
      return { awarded: 0, pending: true };
    }

    tx.set(familyRef.collection("adHocCompletions").doc(), {
      typeId,
      completedBy: uid,
      timestamp: Date.now(),
      xpAwarded: type.xpValue,
      status: "approved",
      ...(photoUrl ? { photoUrl } : {}),
    });
    tx.set(
      familyRef.collection("xpLedger").doc(),
      buildLedgerEntry({ userId: uid, delta: type.xpValue, reason: "adhoc_task", relatedTaskId: typeId })
    );
    tx.update(memberRef, { xpBalance: FieldValue.increment(type.xpValue) });
    return { awarded: type.xpValue, pending: false };
  });

  return { awarded, pending };
});
