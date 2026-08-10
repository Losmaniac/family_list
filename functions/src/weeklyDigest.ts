/**
 * Weekly AI family digest — every Sunday 18:00 (Europe/Prague), summarizes
 * each family's past 7 days (tasks completed, XP earned, current streak)
 * into a short, warm Czech recap written by whichever AI provider the
 * family has configured (same Gemini→OpenRouter fallback as AI otázky, via
 * aiProvider.ts). Stored in families/{familyId}/weeklyDigests/{weekKey}
 * (weekKey = the oldest date in the 7-day window, YYYY-MM-DD — also doubles
 * as an idempotency key if the cron ever fires twice the same week) and
 * pushed to every member with a push token.
 *
 * A family with no AI provider configured, or where the whole week was
 * inactive (nobody completed a task or earned XP), is silently skipped —
 * the digest is a nice-to-have on top of the app, never something the rest
 * of it depends on.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { dateKeyInFamilyZone } from "../../lib/date-utils";
import { loadAiSecrets, generateWithFallback } from "./aiProvider";
import { notifyMembers } from "./notifyHelpers";
import type { Member } from "../../lib/types";

const CZECH_QUALITY_INSTRUCTION =
  "Jsi český asistent. Tvým úkolem je odpovídat výhradně v plynulé, spisovné a gramaticky absolutně správné češtině. Zkontroluj si skloňování a časování slov předtím, než vypíšeš odpověď.";

interface MemberWeekStats {
  name: string;
  tasksCompleted: number;
  xpEarned: number;
  currentStreak: number;
}

function buildDigestPrompt(familyName: string, stats: MemberWeekStats[]): string {
  const lines = stats.map(
    (s) => `- ${s.name}: ${s.tasksCompleted} splněných úkolů, ${s.xpEarned >= 0 ? "+" : ""}${s.xpEarned} XP, aktuální streak ${s.currentStreak} dní v kuse`
  );
  return [
    CZECH_QUALITY_INSTRUCTION,
    `Napiš krátký (3-5 vět), vřelý a povzbudivý týdenní souhrn pro rodinu "${familyName}", která používá rodinnou aplikaci na úkoly a XP.`,
    "Data za uplynulý týden, člen po členovi:",
    ...lines,
    "Vyzdvihni konkrétní úspěchy jmenovitě. Buď pozitivní i k tomu, komu se dařilo méně — povzbuď ho na příští týden, nekritizuj. Piš souvislý text bez nadpisu, bez odrážek a bez markdown formátování — jen čistou odpověď určenou přímo k zobrazení v appce.",
  ].join("\n");
}

export const weeklyDigestGenerator = onSchedule({ schedule: "0 18 * * 0", timeZone: "Europe/Prague" }, async () => {
  const db = getFirestore();
  const now = new Date();

  // The 7 family-zone calendar dates this digest covers, oldest first —
  // computed from real elapsed time rather than calendar-week boundaries,
  // so it's correct regardless of host-process time zone (Cloud Functions
  // run in UTC; dateKeyInFamilyZone converts each instant to Prague).
  const dayKeys = Array.from({ length: 7 }, (_, i) => dateKeyInFamilyZone(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))).reverse();
  const weekKey = dayKeys[0];
  const weekStartMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  const familiesSnapshot = await db.collection("families").get();

  for (const familyDoc of familiesSnapshot.docs) {
    try {
      const membersSnap = await familyDoc.ref.collection("members").get();
      const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member);
      if (members.length === 0) continue;

      const secrets = await loadAiSecrets(db, familyDoc.id);
      if (!secrets.gemini?.apiKey && !secrets.openRouter?.apiKey) continue;

      const [tasksSnap, ledgerSnap] = await Promise.all([
        familyDoc.ref.collection("dailyTasks").where("date", ">=", dayKeys[0]).get(),
        familyDoc.ref.collection("xpLedger").where("timestamp", ">=", weekStartMs).get(),
      ]);

      const tasksByMember = new Map<string, number>();
      for (const doc of tasksSnap.docs as QueryDocumentSnapshot<DocumentData>[]) {
        const data = doc.data();
        if (data.status !== "done") continue;
        tasksByMember.set(data.assignedTo, (tasksByMember.get(data.assignedTo) ?? 0) + 1);
      }

      const xpByMember = new Map<string, number>();
      for (const doc of ledgerSnap.docs as QueryDocumentSnapshot<DocumentData>[]) {
        const data = doc.data();
        xpByMember.set(data.userId, (xpByMember.get(data.userId) ?? 0) + data.delta);
      }

      const stats: MemberWeekStats[] = members.map((m) => ({
        name: m.name,
        tasksCompleted: tasksByMember.get(m.id) ?? 0,
        xpEarned: xpByMember.get(m.id) ?? 0,
        currentStreak: m.currentStreak ?? 0,
      }));
      if (stats.every((s) => s.tasksCompleted === 0 && s.xpEarned === 0)) continue;

      const text = await generateWithFallback(secrets, buildDigestPrompt(familyDoc.data().name ?? "rodina", stats), (raw) => {
        const trimmed = raw.trim();
        return trimmed.length > 0 ? trimmed : null;
      });
      if (!text) continue;

      await familyDoc.ref.collection("weeklyDigests").doc(weekKey).set({
        text,
        weekStart: dayKeys[0],
        weekEnd: dayKeys[6],
        stats,
        generatedAt: Date.now(),
      });

      await notifyMembers(
        familyDoc.id,
        "weekly_digest",
        members.map((m) => ({ userId: m.id, fcmToken: m.fcmToken })),
        "Týdenní souhrn",
        text.length > 150 ? `${text.slice(0, 147)}…` : text,
        db
      );
    } catch {
      // One family's AI/query failure shouldn't block the rest — they get
      // this week's digest skipped, same as "no AI key configured".
    }
  }
});
