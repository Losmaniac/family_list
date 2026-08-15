/**
 * "AI učitel" — an open-ended tutoring chat, free-text subject rather than
 * a fixed topic list (unlike AI otázky), no XP attached at all since it's
 * a study aid, not a graded exercise. Provider selection/fallback is
 * shared with aiQuiz.ts/weeklyDigest.ts via aiProvider.ts.
 *
 * Conversation history is supplied by the client (already scoped to the
 * current subject's thread — see AiTutorMessage.subject in lib/types.ts
 * and components/AiTutorPanel.tsx, which filters its live message
 * subscription by subject in JS) rather than queried here, so switching
 * subject naturally starts a fresh context without needing a composite
 * Firestore index to filter by subject server-side.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  AI_TUTOR_DEPTHS,
  AI_TUTOR_MODES,
  MAX_AI_TUTOR_HISTORY,
  MAX_AI_TUTOR_QUESTION_LENGTH,
  buildAiTutorPrompt,
  normalizeAiTutorSubject,
  parseAiTutorResponse,
  type AiTutorDepth,
  type AiTutorHistoryMessage,
  type AiTutorMode,
} from "../../lib/ai-tutor";
import { requireAuth, requireFamilyMember } from "./practice";
import { loadAiSecrets, generateWithFallback } from "./aiProvider";
import type { AiTutorMessage } from "../../lib/types";

interface AskRequest {
  familyId: string;
  subject: string;
  depth: AiTutorDepth;
  mode: AiTutorMode;
  question: string;
  history?: AiTutorHistoryMessage[];
}

/** The client's own recent thread, sanitized — never trusted verbatim (a family member could fabricate it), just capped in shape/size before it ever reaches a prompt. */
function sanitizeHistory(raw: unknown): AiTutorHistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is AiTutorHistoryMessage =>
        typeof m === "object" &&
        m !== null &&
        (m as { role?: unknown }).role !== undefined &&
        ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { text?: unknown }).text === "string"
    )
    .slice(-MAX_AI_TUTOR_HISTORY)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
}

export const askAiTutor = onCall<AskRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, depth, mode, question } = request.data;

  const subject = typeof request.data.subject === "string" ? normalizeAiTutorSubject(request.data.subject) : null;
  if (!familyId || !subject) {
    throw new HttpsError("invalid-argument", "Napiš platné téma.");
  }
  if (!AI_TUTOR_DEPTHS.some((d) => d.value === depth)) {
    throw new HttpsError("invalid-argument", "Neplatná náročnost.");
  }
  if (!AI_TUTOR_MODES.some((m) => m.value === mode)) {
    throw new HttpsError("invalid-argument", "Neplatný režim.");
  }
  const trimmedQuestion = typeof question === "string" ? question.trim() : "";
  if (!trimmedQuestion || trimmedQuestion.length > MAX_AI_TUTOR_QUESTION_LENGTH) {
    throw new HttpsError("invalid-argument", `Zpráva musí mít 1-${MAX_AI_TUTOR_QUESTION_LENGTH} znaků.`);
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const secrets = await loadAiSecrets(db, familyId);
  if (!secrets.gemini?.apiKey && !secrets.openRouter?.apiKey) {
    throw new HttpsError("failed-precondition", "Rodič ještě nezadal žádný API klíč pro AI v Nastavení.");
  }

  const history = sanitizeHistory(request.data.history);
  const prompt = buildAiTutorPrompt(subject, depth, mode, history, trimmedQuestion);
  const answer = await generateWithFallback(secrets, prompt, parseAiTutorResponse);
  if (!answer) {
    throw new HttpsError("internal", "Ani jeden nastavený model se nepodařilo použít — zkus to znovu za chvíli.");
  }

  const messagesRef = familyRef.collection("aiTutorMessages").doc(uid).collection("messages");
  const now = Date.now();
  const batch = db.batch();
  batch.set(messagesRef.doc(), {
    subject,
    role: "user",
    text: trimmedQuestion,
    timestamp: now,
    depth,
    mode,
  } satisfies Omit<AiTutorMessage, "id">);
  batch.set(messagesRef.doc(), {
    subject,
    role: "assistant",
    text: answer,
    timestamp: now + 1,
    depth,
    mode,
  } satisfies Omit<AiTutorMessage, "id">);
  await batch.commit();

  return { answer };
});
