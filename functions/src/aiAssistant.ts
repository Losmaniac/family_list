/**
 * "AI" — a general-purpose ChatGPT-style assistant, separate from "AI
 * učitel" (no subject/depth/mode). Provider selection/fallback is shared
 * with aiQuiz.ts/aiTutor.ts/weeklyDigest.ts via aiProvider.ts.
 *
 * Conversation history is supplied by the client, already scoped to the
 * current conversation (see AiAssistantMessage.conversationId in
 * lib/types.ts and components/AiAssistantPanel.tsx, which filters its live
 * message subscription by conversationId in JS) rather than queried here —
 * same reasoning as askAiTutor: starting a new conversation gets a clean
 * context without a composite Firestore index.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  MAX_AI_ASSISTANT_HISTORY,
  MAX_AI_ASSISTANT_QUESTION_LENGTH,
  buildAiAssistantPrompt,
  parseAiAssistantResponse,
  type AiAssistantHistoryMessage,
} from "../../lib/ai-assistant";
import { requireAuth, requireFamilyMember } from "./practice";
import { loadAiSecrets, generateWithFallback } from "./aiProvider";
import type { AiAssistantMessage } from "../../lib/types";

interface AskRequest {
  familyId: string;
  conversationId: string;
  question: string;
  history?: AiAssistantHistoryMessage[];
}

/** The client's own recent thread, sanitized — never trusted verbatim (a family member could fabricate it), just capped in shape/size before it ever reaches a prompt. */
function sanitizeHistory(raw: unknown): AiAssistantHistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is AiAssistantHistoryMessage =>
        typeof m === "object" &&
        m !== null &&
        ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { text?: unknown }).text === "string"
    )
    .slice(-MAX_AI_ASSISTANT_HISTORY)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) }));
}

export const askAiAssistant = onCall<AskRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, conversationId, question } = request.data;

  if (!familyId || typeof conversationId !== "string" || !conversationId.trim()) {
    throw new HttpsError("invalid-argument", "Neplatný požadavek.");
  }
  const trimmedQuestion = typeof question === "string" ? question.trim() : "";
  if (!trimmedQuestion || trimmedQuestion.length > MAX_AI_ASSISTANT_QUESTION_LENGTH) {
    throw new HttpsError("invalid-argument", `Zpráva musí mít 1-${MAX_AI_ASSISTANT_QUESTION_LENGTH} znaků.`);
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const secrets = await loadAiSecrets(db, familyId);
  if (!secrets.gemini?.apiKey && !secrets.openRouter?.apiKey) {
    throw new HttpsError("failed-precondition", "Rodič ještě nezadal žádný API klíč pro AI v Nastavení.");
  }

  const history = sanitizeHistory(request.data.history);
  const prompt = buildAiAssistantPrompt(history, trimmedQuestion);
  const answer = await generateWithFallback(secrets, prompt, parseAiAssistantResponse);
  if (!answer) {
    throw new HttpsError("internal", "Ani jeden nastavený model se nepodařilo použít — zkus to znovu za chvíli.");
  }

  const messagesRef = familyRef.collection("aiAssistantMessages").doc(uid).collection("messages");
  const now = Date.now();
  const batch = db.batch();
  batch.set(messagesRef.doc(), {
    conversationId,
    role: "user",
    text: trimmedQuestion,
    timestamp: now,
  } satisfies Omit<AiAssistantMessage, "id">);
  batch.set(messagesRef.doc(), {
    conversationId,
    role: "assistant",
    text: answer,
    timestamp: now + 1,
  } satisfies Omit<AiAssistantMessage, "id">);
  await batch.commit();

  return { answer };
});
