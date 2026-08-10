/**
 * "AI otázky" — a Vzdělání subject with no fixed question bank at all:
 * every question is generated on demand by an LLM. A family can configure
 * either (or both) of two providers in Settings — Gemini, or OpenRouter
 * (a router that fronts many models, several with a free tier) — each key
 * entered once (setGeminiApiKey / setOpenRouterConfig below) and stored
 * server-only in families/{familyId}/secrets/{gemini,openrouter}; it never
 * touches a client after that first submit, same trust boundary as
 * everything else money/credential-shaped in this app. When both are
 * configured, OpenRouter is used — picking a specific model there is a
 * more deliberate choice than just pasting a Gemini key, so it's treated
 * as the family's active preference.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { AI_QUIZ_TOPICS, buildAiQuizPrompt, parseAiQuizResponse, shuffleThree } from "../../lib/ai-quiz";
import { isAnswerCorrect, primaryAnswer, PRACTICE_XP_PER_PROBLEM } from "../../lib/practice";
import { requireAuth, requireFamilyMember, awardCappedPracticeXp, getPracticeXpHeadroomToday } from "./practice";
import type { Member } from "../../lib/types";

const GEMINI_MODEL = "gemini-2.0-flash";

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
  apiKey: string;
  model: string;
}

export const setOpenRouterConfig = onCall<SetOpenRouterConfigRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, apiKey, model } = request.data;
  if (!familyId || typeof apiKey !== "string" || apiKey.trim().length < 10 || typeof model !== "string" || !model.trim()) {
    throw new HttpsError("invalid-argument", "Zadej platný API klíč a vyber model.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  await requireParent(db, familyId, uid);

  await familyRef.collection("secrets").doc("openrouter").set({ apiKey: apiKey.trim(), model: model.trim(), updatedAt: Date.now() });
  await familyRef.update({ openRouterApiKeyConfigured: true, openRouterModel: model.trim() });

  return { configured: true };
});

type AiProviderConfig = { provider: "openrouter"; apiKey: string; model: string } | { provider: "gemini"; apiKey: string };

async function resolveAiProviderConfig(db: Firestore, familyId: string): Promise<AiProviderConfig> {
  const familyRef = db.collection("families").doc(familyId);
  const [openRouterSnap, geminiSnap] = await Promise.all([
    familyRef.collection("secrets").doc("openrouter").get(),
    familyRef.collection("secrets").doc("gemini").get(),
  ]);

  const openRouter = openRouterSnap.data() as { apiKey?: string; model?: string } | undefined;
  if (openRouter?.apiKey && openRouter.model) {
    return { provider: "openrouter", apiKey: openRouter.apiKey, model: openRouter.model };
  }

  const gemini = geminiSnap.data() as { apiKey?: string } | undefined;
  if (gemini?.apiKey) {
    return { provider: "gemini", apiKey: gemini.apiKey };
  }

  throw new HttpsError("failed-precondition", "Rodič ještě nezadal žádný API klíč pro AI otázky v Nastavení.");
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
  if (res.status === 429) {
    // Gemini's free tier has a low per-minute/per-day request quota —
    // this is expected under normal family use, not a bug. Configuring
    // OpenRouter as well (Settings → AI otázky) sidesteps it entirely,
    // since resolveAiProviderConfig prefers OpenRouter whenever both are set.
    throw new HttpsError(
      "resource-exhausted",
      "Gemini má vyčerpaný bezplatný limit dotazů na dnes/tuto minutu — zkus to za chvíli znovu, nebo nastav v Nastavení i OpenRouter jako druhou možnost."
    );
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

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new HttpsError("failed-precondition", "API klíč pro OpenRouter se zdá být neplatný — zkontroluj ho v Nastavení.");
  }
  if (res.status === 429) {
    throw new HttpsError("resource-exhausted", "Zvolený model na OpenRouter má vyčerpaný limit dotazů — zkus to za chvíli znovu, nebo v Nastavení vyber jiný model.");
  }
  if (!res.ok) {
    throw new HttpsError("unavailable", `OpenRouter je momentálně nedostupný (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new HttpsError("internal", "Neplatná odpověď od AI.");
  return text;
}

async function callAiProvider(config: AiProviderConfig, prompt: string): Promise<string> {
  return config.provider === "openrouter" ? callOpenRouter(config.apiKey, config.model, prompt) : callGemini(config.apiKey, prompt);
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

  const providerConfig = await resolveAiProviderConfig(db, familyId);
  const raw = await callAiProvider(providerConfig, buildAiQuizPrompt(topic.label));
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
