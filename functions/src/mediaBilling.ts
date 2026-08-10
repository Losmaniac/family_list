/**
 * Charges XP for listening to Rádio / watching TV on /media — called
 * client-side once per billable block (see lib/media-billing.ts for the
 * schedule). XP still only ever moves through trusted server code, same
 * as everywhere else: the client can't decrement its own xpBalance
 * directly, it just asks this callable to do it and stops playback if the
 * answer is "can't afford it".
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry, canAffordReward } from "../../lib/xp-engine";
import { MEDIA_XP_COST_PER_BLOCK, type MediaKind } from "../../lib/media-billing";

const MAX_CHANNEL_NAME_LENGTH = 120;

interface ChargeRequest {
  familyId: string;
  kind: MediaKind;
  /** The station/channel name currently playing — purely informational, shown to parents in /analytics (see lib/xp-analytics.ts). Never trusted for anything billing-related. */
  channelName?: string;
}

export const chargeMediaListening = onCall<ChargeRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const { familyId, kind, channelName } = request.data;
  if (!familyId || (kind !== "radio" && kind !== "tv")) {
    throw new HttpsError("invalid-argument", "familyId and a valid kind are required.");
  }
  const trimmedChannelName = typeof channelName === "string" ? channelName.trim().slice(0, MAX_CHANNEL_NAME_LENGTH) : "";
  const note = trimmedChannelName.length > 0 ? trimmedChannelName : undefined;

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const memberRef = familyRef.collection("members").doc(uid);
  const cost = MEDIA_XP_COST_PER_BLOCK[kind];

  return db.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    const member = memberSnap.data() as { xpBalance: number } | undefined;
    if (!member || !canAffordReward(member.xpBalance, cost)) {
      return { charged: false };
    }

    tx.set(
      familyRef.collection("xpLedger").doc(),
      buildLedgerEntry({ userId: uid, delta: -cost, reason: kind === "radio" ? "radio_listening" : "tv_watching", note })
    );
    tx.update(memberRef, { xpBalance: FieldValue.increment(-cost) });
    return { charged: true };
  });
});
