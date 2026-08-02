/**
 * Cron 00:05 — generuje dailyTasks z aktivních taskTemplates pro daný den.
 * dailyTasks se negenerují dopředu do nekonečna, jen na aktuální den.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { generateDailyTasks, dailyTaskId } from "../../lib/task-scheduler";
import type { TaskTemplate } from "../../lib/types";

export const dailyTaskGenerator = onSchedule(
  { schedule: "5 0 * * *", timeZone: "Europe/Prague" },
  async () => {
    const db = getFirestore();
    const now = new Date();

    const familiesSnapshot = await db.collection("families").get();

    for (const familyDoc of familiesSnapshot.docs) {
      const templatesSnapshot = await familyDoc.ref
        .collection("taskTemplates")
        .where("active", "==", true)
        .get();

      const templates = templatesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as TaskTemplate
      );

      const tasks = generateDailyTasks(templates, now);
      if (tasks.length === 0) continue;

      const batch = db.batch();
      for (const task of tasks) {
        const id = dailyTaskId(task.date, task.templateId);
        const ref = familyDoc.ref.collection("dailyTasks").doc(`${id}_${task.assignedTo}`);
        batch.set(ref, task);
      }
      await batch.commit();
    }
  }
);
