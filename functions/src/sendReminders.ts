/**
 * Web Push (FCM) večerní připomínka na nesplněné dailyTasks daného dne.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { dateKeyInFamilyZone } from "../../lib/date-utils";

export const sendReminders = onSchedule(
  { schedule: "0 19 * * *", timeZone: "Europe/Prague" },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const today = dateKeyInFamilyZone(new Date());

    const familiesSnapshot = await db.collection("families").get();

    for (const familyDoc of familiesSnapshot.docs) {
      const pendingSnapshot = await familyDoc.ref
        .collection("dailyTasks")
        .where("date", "==", today)
        .where("status", "==", "pending")
        .get();

      const pendingByMember = new Map<string, number>();
      for (const doc of pendingSnapshot.docs) {
        const assignedTo = doc.data().assignedTo as string;
        pendingByMember.set(assignedTo, (pendingByMember.get(assignedTo) ?? 0) + 1);
      }

      for (const [userId, count] of pendingByMember) {
        const memberDoc = await familyDoc.ref.collection("members").doc(userId).get();
        const fcmToken = memberDoc.data()?.fcmToken as string | undefined;
        if (!fcmToken) continue;

        await messaging.send({
          token: fcmToken,
          notification: {
            title: "Family Quest",
            body: `Máš ${count} nedokončených úkolů na dnes.`,
          },
        });
      }
    }
  }
);
