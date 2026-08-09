/**
 * "Jednorázové úkoly" (ad-hoc tasks) — irregular chores that don't fit a
 * daily/weekly recurrence (e.g. emptying the dishwasher): a parent defines
 * the type (title, XP, cooldown) in Settings, and any family member can mark
 * one done on demand from /today. Awarding XP and enforcing the cooldown
 * both happen here, server-side — the client only ever reads adHocCompletions
 * (read-only, same trust tier as xpLedger) to render its countdown, never
 * decides for itself whether enough time has passed.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { adHocCooldownInfo, formatCooldownRemaining } from "../../lib/adhoc-tasks";
import { requireAuth, requireFamilyMember } from "./practice";
import type { AdHocTaskType } from "../../lib/types";

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

  const awarded = await db.runTransaction(async (tx) => {
    const [typeSnap, lastSnap] = await Promise.all([tx.get(typeRef), tx.get(lastCompletionQuery)]);
    const type = typeSnap.data() as AdHocTaskType | undefined;
    if (!type || !type.active) throw new HttpsError("failed-precondition", "Tento úkol už není dostupný.");
    if (type.photoRequired && !photoUrl) throw new HttpsError("invalid-argument", "Tento úkol vyžaduje foto.");

    const lastCompletedAt = lastSnap.empty ? undefined : (lastSnap.docs[0].data().timestamp as number);
    const cooldown = adHocCooldownInfo(type.cooldownMinutes, lastCompletedAt);
    if (cooldown.onCooldown) {
      throw new HttpsError(
        "failed-precondition",
        `Ještě chvíli počkej — zbývá ${formatCooldownRemaining(cooldown.remainingMs)}.`
      );
    }

    tx.set(familyRef.collection("adHocCompletions").doc(), {
      typeId,
      completedBy: uid,
      timestamp: Date.now(),
      xpAwarded: type.xpValue,
      ...(photoUrl ? { photoUrl } : {}),
    });
    tx.set(
      familyRef.collection("xpLedger").doc(),
      buildLedgerEntry({ userId: uid, delta: type.xpValue, reason: "adhoc_task", relatedTaskId: typeId })
    );
    tx.update(memberRef, { xpBalance: FieldValue.increment(type.xpValue) });
    return type.xpValue;
  });

  return { awarded };
});
