/**
 * "AI otázky" — a Vzdělání subject with no fixed question bank at all:
 * every question is generated on demand by Gemini. The API key is
 * per-family, entered by a parent in Settings (setGeminiApiKey below) and
 * stored server-only in families/{familyId}/secrets/gemini — it never
 * touches a client after that first submit, same trust boundary as
 * everything else money/credential-shaped in this app.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { AI_QUIZ_TOPICS, buildAiQuizPrompt, parseAiQuizResponse, shuffleThree } from "../../lib/ai-quiz";
import { isAnswerCorrect, primaryAnswer, PRACTICE_XP_PER_PROBLEM } from "../../lib/practice";
import { requireAuth, requireFamilyMember, awardCappedPracticeXp, getPracticeXpHeadroomToday } from "./practice";
import type { Member } from "../../lib/types";

const GEMINI_MODEL = "gemini-2.0-flash";

interface SetKeyRequest {
  familyId: string;
  apiKey: string;
}

export const setGeminiApiKey = onCall<SetKeyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, apiKey } = request.data;
  if (!familyId || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    throw new HttpsError("invalid-argument", "Zadej platný API klíč.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const memberSnap = await familyRef.collection("members").doc(uid).get();
  const member = memberSnap.data() as Member | undefined;
  if (member?.role !== "parent") {
    throw new HttpsError("permission-denied", "Jen rodič může nastavit API klíč.");
  }

  await familyRef.collection("secrets").doc("gemini").set({ apiKey: apiKey.trim(), updatedAt: Date.now() });
  await familyRef.update({ geminiApiKeyConfigured: true });

  return { configured: true };
});

async function fetchGeminiApiKey(familyId: string): Promise<string> {
  const db = getFirestore();
  const snap = await db.collection("families").doc(familyId).collection("secrets").doc("gemini").get();
  const apiKey = snap.data()?.apiKey as string | undefined;
  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "Rodič ještě nezadal API klíč pro AI otázky v Nastavení."
    );
  }
  return apiKey;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (res.status === 400 || res.status === 403) {
    throw new HttpsError("failed-precondition", "API klíč pro Gemini se zdá být neplatný — zkontroluj ho v Nastavení.");
  }
  if (!res.ok) {
    throw new HttpsError("unavailable", `Gemini je momentálně nedostupné (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new HttpsError("internal", "Neplatná odpověď od AI.");
  return text;
}

interface GenerateRequest {
  familyId: string;
  topicId: string;
}

export const generateAiQuizQuestion = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, topicId } = request.data;
  const topic = AI_QUIZ_TOPICS.find((t) => t.id === topicId);
  if (!familyId || !topic) throw new HttpsError("invalid-argument", "Neplatný požadavek.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const headroom = await getPracticeXpHeadroomToday(familyRef, uid);
  if (headroom <= 0) {
    return { question: null, options: null, capReached: true };
  }

  const apiKey = await fetchGeminiApiKey(familyId);
  const raw = await callGemini(apiKey, buildAiQuizPrompt(topic.label));
  const parsed = parseAiQuizResponse(raw);
  if (!parsed) {
    throw new HttpsError("internal", "AI vrátila neplatnou otázku — zkus to znovu.");
  }

  const options = shuffleThree(parsed.options);

  await familyRef.collection("practicePendingAi").doc(uid).set({
    question: parsed.question,
    options,
    answer: parsed.answer,
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

  if (!correct) {
    return { correct: false, correctAnswer: primaryAnswer(pending.answer as string), awarded: 0 };
  }

  const awarded = await awardCappedPracticeXp(db, familyRef, uid, PRACTICE_XP_PER_PROBLEM);
  return { correct: true, correctAnswer: primaryAnswer(pending.answer as string), awarded, capReached: awarded < PRACTICE_XP_PER_PROBLEM };
});
