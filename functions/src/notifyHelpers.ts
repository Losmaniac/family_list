/**
 * Shared by every notification trigger. Each call does two things per
 * (post-preference-filter) recipient: writes an in-app
 * families/{familyId}/notifications/{id} record (what drives the
 * unread-count badge on the header avatar — written regardless of whether
 * the recipient has a push token, since that's an in-app feature, not a
 * push one) and, only for recipients who do have a token, sends the actual
 * FCM push. Push sending is best-effort per token.
 *
 * Every call passes a NotificationTypeId so a parent's per-type Settings
 * choices (Family.notificationSettings — see lib/notification-settings.ts)
 * apply uniformly: a disabled type sends nothing at all, and a
 * recipientIds allowlist narrows the natural audience passed in (never
 * adds anyone outside it).
 *
 * Sends `data` only, never a top-level `notification` payload. A
 * `notification` payload gets displayed automatically by the browser
 * itself when the page isn't focused, *and* the service worker's
 * `onBackgroundMessage` (app/sw.js/route.ts) also fires and calls
 * `showNotification` for it — resulting in the same push showing up
 * twice. Data-only messages skip the browser's automatic display, so the
 * service worker's single `showNotification` call is the only one.
 */
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { applyNotificationSettings } from "../../lib/notification-settings";
import type { Family, NotificationTypeId } from "../../lib/types";

export interface NotifyTarget {
  userId: string;
  fcmToken?: string;
}

export async function notifyMembers(
  familyId: string,
  typeId: NotificationTypeId,
  naturalTargets: NotifyTarget[],
  title: string,
  body: string,
  db: Firestore = getFirestore()
): Promise<void> {
  if (naturalTargets.length === 0) return;

  const familySnap = await db.collection("families").doc(familyId).get();
  const settings = (familySnap.data() as Family | undefined)?.notificationSettings;
  const targets = applyNotificationSettings(settings, typeId, naturalTargets);
  if (targets.length === 0) return;

  const notificationsRef = db.collection("families").doc(familyId).collection("notifications");
  const batch = db.batch();
  for (const target of targets) {
    batch.set(notificationsRef.doc(), { userId: target.userId, title, body, createdAt: Date.now(), read: false });
  }

  const messaging = getMessaging();
  await Promise.all([
    batch.commit(),
    ...targets
      .filter((t): t is NotifyTarget & { fcmToken: string } => Boolean(t.fcmToken))
      .map((t) =>
        messaging.send({ token: t.fcmToken, data: { title, body } }).catch(() => {
          // A stale/expired token shouldn't fail the whole batch.
        })
      ),
  ]);
}
