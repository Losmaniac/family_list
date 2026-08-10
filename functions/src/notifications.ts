/**
 * Lets a member self-verify that push notifications actually arrive on
 * their device, rather than just trusting "we saved a token once" — FCM
 * tokens can go stale or the OS can silently stop delivering without any
 * error surfacing back to the app. Looks up the caller's own family via
 * users/{uid} (never trusts a client-supplied familyId) so this can only
 * ever send to the calling user's own device.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import type { Member, UserFamilyMapping } from "../../lib/types";

export const sendTestNotification = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const db = getFirestore();
  const mappingSnap = await db.collection("users").doc(uid).get();
  const mapping = mappingSnap.data() as UserFamilyMapping | undefined;
  if (!mapping) throw new HttpsError("failed-precondition", "No family found for this account.");

  const memberSnap = await db.collection("families").doc(mapping.familyId).collection("members").doc(uid).get();
  const member = memberSnap.data() as Member | undefined;
  if (!member?.fcmToken) throw new HttpsError("failed-precondition", "Notifikace nejsou zapnuté na tomto zařízení.");

  try {
    await getMessaging().send({
      token: member.fcmToken,
      // data-only, not notification — see notifyHelpers.ts's notifyMembers
      // comment for why (avoids a duplicate on-device notification). This
      // diagnostic ping intentionally skips notifyMembers (and its
      // notification-log write) so a real send failure surfaces back to
      // the caller instead of being swallowed.
      data: {
        title: "Family Quest",
        body: "Testovací upozornění dorazilo! 🎉",
      },
    });
  } catch (error) {
    throw new HttpsError("internal", error instanceof Error ? error.message : "Send failed.");
  }

  return { sent: true };
});
