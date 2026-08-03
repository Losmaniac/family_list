/**
 * Cron 00:05 — nejdřív označí včerejší (a starší) nesplněné dailyTasks jako
 * 'missed', pak vygeneruje dnešní dailyTasks z aktivních taskTemplates.
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
    const dateKey = now.toISOString().slice(0, 10);

    const familiesSnapshot = await db.collection("families").get();

    for (const familyDoc of familiesSnapshot.docs) {
      const staleSnapshot = await familyDoc.ref
        .collection("dailyTasks")
        .where("status", "==", "pending")
        .where("date", "<", dateKey)
        .get();

      if (!staleSnapshot.empty) {
        const missedBatch = db.batch();
        for (const staleDoc of staleSnapshot.docs) {
          missedBatch.update(staleDoc.ref, { status: "missed" });
        }
        await missedBatch.commit();
      }

      const templatesSnapshot = await familyDoc.ref
        .collection("taskTemplates")
        .where("active", "==", true)
        .get();

      const templates = templatesSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as TaskTemplate
      );

      const tasks = generateDailyTasks(templates, now);
      if (tasks.length === 0) continue;

      // onTaskTemplateWritten may have already created some of today's tasks
      // (e.g. a template edited earlier today) — never overwrite those, it'd
      // clobber a status the user already changed (e.g. back to 'pending').
      const existingTodaySnapshot = await familyDoc.ref
        .collection("dailyTasks")
        .where("date", "==", dateKey)
        .get();
      const existingIds = new Set(existingTodaySnapshot.docs.map((doc) => doc.id));

      const batch = db.batch();
      for (const task of tasks) {
        const id = dailyTaskId(task.date, task.templateId, task.assignedTo);
        if (existingIds.has(id)) continue;
        batch.set(familyDoc.ref.collection("dailyTasks").doc(id), task);
      }
      await batch.commit();
    }
  }
);
