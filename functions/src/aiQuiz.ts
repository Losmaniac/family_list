/**
 * "AI otázky" — a Vzdělání subject with no fixed question bank at all:
 * every question is generated on demand by an LLM. Provider selection/
 * fallback (Gemini first, then OpenRouter) and API key storage are shared
 * with weeklyDigest.ts via aiProvider.ts — see that file for the full
 * explanation of the Gemini→OpenRouter fallback chain and key storage.
 *
 * Difficulty ramps up per topic: families/{familyId}/aiQuizProgress/{uid}
 * tracks a consecutive-correct streak per topic (keyed via
 * lib/ai-quiz.ts's streakKeyForTopic), which submitAiQuizAnswer increments
 * on a correct answer and resets to 0 on a wrong one; generateAiQuizQuestion
 * reads it and turns it into a difficulty label for the prompt. A topicId of
 * "custom" lets the user type their own subject instead of picking from
 * AI_QUIZ_TOPICS — validated server-side by normalizeCustomTopic and never
 * trusted as a fixed id, since its streak bucket is derived from the text.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  AI_QUIZ_TOPICS,
  buildAiQuizPrompt,
  CUSTOM_TOPIC_ID,
  difficultyLabelForStreak,
  normalizeCustomTopic,
  parseAiQuizResponse,
  shuffleThree,
  streakKeyForTopic,
} from "../../lib/ai-quiz";
import { isAnswerCorrect, primaryAnswer, PRACTICE_XP_PER_PROBLEM } from "../../lib/practice";
import { requireAuth, requireFamilyMember, awardCappedPracticeXp, getPracticeXpHeadroomToday } from "./practice";
import { loadAiSecrets, generateWithFallback } from "./aiProvider";
import type { Member } from "../../lib/types";

async function requireParent(db: Firestore, familyId: string, uid: string): Promise<void> {
  const memberSnap = await db.collection("families").doc(familyId).collection("members").doc(uid).get();
  const member = memberSnap.data() as Member | undefined;
  if (member?.role !== "parent") {
    throw new HttpsError("permission-denied", "Jen rodič může nastavit API klíč.");
  }
}

interface SetGeminiKeyRequest {
  familyId: string;
  apiKey: string;
}

export const setGeminiApiKey = onCall<SetGeminiKeyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, apiKey } = request.data;
  if (!familyId || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    throw new HttpsError("invalid-argument", "Zadej platný API klíč.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  await requireParent(db, familyId, uid);

  await familyRef.collection("secrets").doc("gemini").set({ apiKey: apiKey.trim(), updatedAt: Date.now() });
  await familyRef.update({ geminiApiKeyConfigured: true });

  return { configured: true };
});

interface SetOpenRouterConfigRequest {
  familyId: string;
  apiKey?: string;
  model: string;
}

/**
 * apiKey is optional so the model can be switched quickly without having to
 * re-paste the key every time — settings.tsx's "Rychlá změna modelu" flow
 * calls this with just {familyId, model}. Omitting it requires a key to
 * already be on file; nothing here ever reads the stored key back out.
 */
export const setOpenRouterConfig = onCall<SetOpenRouterConfigRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, apiKey, model } = request.data;
  if (!familyId || typeof model !== "string" || !model.trim()) {
    throw new HttpsError("invalid-argument", "Vyber platný model.");
  }
  if (apiKey !== undefined && (typeof apiKey !== "string" || apiKey.trim().length < 10)) {
    throw new HttpsError("invalid-argument", "Zadej platný API klíč.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  await requireParent(db, familyId, uid);

  const secretRef = familyRef.collection("secrets").doc("openrouter");
  if (apiKey) {
    await secretRef.set({ apiKey: apiKey.trim(), model: model.trim(), updatedAt: Date.now() });
  } else {
    const existing = (await secretRef.get()).data() as { apiKey?: string } | undefined;
    if (!existing?.apiKey) {
      throw new HttpsError("failed-precondition", "Nejdřív zadej API klíč.");
    }
    await secretRef.set({ model: model.trim(), updatedAt: Date.now() }, { merge: true });
  }
  await familyRef.update({ openRouterApiKeyConfigured: true, openRouterModel: model.trim() });

  return { configured: true };
});

interface GenerateRequest {
  familyId: string;
  topicId: string;
  customTopic?: string;
}

export const generateAiQuizQuestion = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, topicId, customTopic } = request.data;

  let topicLabel: string;
  if (topicId === CUSTOM_TOPIC_ID) {
    const normalized = typeof customTopic === "string" ? normalizeCustomTopic(customTopic) : null;
    if (!familyId || !normalized) {
      throw new HttpsError("invalid-argument", "Napiš platné vlastní téma.");
    }
    topicLabel = normalized;
  } else {
    const topic = AI_QUIZ_TOPICS.find((t) => t.id === topicId);
    if (!familyId || !topic) throw new HttpsError("invalid-argument", "Neplatný požadavek.");
    topicLabel = topic.label;
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const headroom = await getPracticeXpHeadroomToday(familyRef, uid);
  if (headroom <= 0) {
    return { question: null, options: null, capReached: true };
  }

  const secrets = await loadAiSecrets(db, familyId);
  if (!secrets.gemini?.apiKey && !secrets.openRouter?.apiKey) {
    throw new HttpsError("failed-precondition", "Rodič ještě nezadal žádný API klíč pro AI otázky v Nastavení.");
  }

  const streakKey = streakKeyForTopic(topicId, topicId === CUSTOM_TOPIC_ID ? topicLabel : undefined);
  const progressSnap = await familyRef.collection("aiQuizProgress").doc(uid).get();
  const streak = (progressSnap.data()?.streaks?.[streakKey] as number | undefined) ?? 0;

  const parsed = await generateWithFallback(secrets, buildAiQuizPrompt(topicLabel, difficultyLabelForStreak(streak)), parseAiQuizResponse);
  if (!parsed) {
    throw new HttpsError("internal", "Ani jeden nastavený model se nepodařilo použít — zkus to znovu za chvíli.");
  }

  const options = shuffleThree(parsed.options);

  await familyRef.collection("practicePendingAi").doc(uid).set({
    question: parsed.question,
    options,
    answer: parsed.answer,
    streakKey,
    createdAt: Date.now(),
  });

  return { question: parsed.question, options, capReached: false };
});

interface SubmitRequest {
  familyId: string;
  answer: string;
}

export const submitAiQuizAnswer = onCall<SubmitRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, answer } = request.data;
  if (!familyId || typeof answer !== "string") {
    throw new HttpsError("invalid-argument", "familyId and answer are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const pendingRef = familyRef.collection("practicePendingAi").doc(uid);
  const pendingSnap = await pendingRef.get();
  const pending = pendingSnap.data();
  if (!pending) {
    throw new HttpsError("failed-precondition", "Žádná otázka nečeká — vyžádej si novou.");
  }

  const correct = isAnswerCorrect(answer, pending.answer as string);
  await pendingRef.delete();

  const streakKey = pending.streakKey as string | undefined;
  if (streakKey) {
    const progressRef = familyRef.collection("aiQuizProgress").doc(uid);
    await progressRef.set({ streaks: { [streakKey]: correct ? FieldValue.increment(1) : 0 } }, { merge: true });
  }

  if (!correct) {
    return { correct: false, correctAnswer: primaryAnswer(pending.answer as string), awarded: 0 };
  }

  const awarded = await awardCappedPracticeXp(db, familyRef, uid, PRACTICE_XP_PER_PROBLEM);
  return { correct: true, correctAnswer: primaryAnswer(pending.answer as string), awarded, capReached: awarded < PRACTICE_XP_PER_PROBLEM };
});
