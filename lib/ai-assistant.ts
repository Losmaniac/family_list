/**
 * "AI" — a general-purpose ChatGPT-style assistant, deliberately separate
 * from "AI učitel" (Vzdělání): no subject/depth/mode setup, just an open
 * conversation, organized into multiple named-by-content threads
 * (conversations) the same way a classic chat assistant works. Provider
 * selection/fallback is shared with aiQuiz.ts/aiTutor.ts/weeklyDigest.ts via
 * aiProvider.ts. functions/src/aiAssistant.ts calls the API; the key never
 * reaches the client.
 */
import { CZECH_QUALITY_INSTRUCTION } from "./ai-quiz";

export const MAX_AI_ASSISTANT_QUESTION_LENGTH = 4000;
/** How many previous turns are fed back into the prompt as conversation context — older history is dropped, not summarized. */
export const MAX_AI_ASSISTANT_HISTORY = 20;
const CONVERSATION_TITLE_MAX_LENGTH = 60;

export interface AiAssistantHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export function buildAiAssistantPrompt(history: AiAssistantHistoryMessage[], question: string): string {
  const lines = [
    CZECH_QUALITY_INSTRUCTION,
    "Jsi obecný, přátelský AI asistent pro celou rodinu — pomáháš s čímkoliv uživatel potřebuje: odpovídáš na otázky, pomáháš psát a upravovat texty, radíš, vysvětluješ, diskutuješ. Odpovídej přirozeně a k věci, ne zbytečně rozvláčně.",
  ];
  if (history.length > 0) {
    lines.push("Dosavadní konverzace (jen pro kontext, needpovídej na ni znovu):");
    for (const turn of history) {
      lines.push(`${turn.role === "user" ? "Uživatel" : "Asistent"}: ${turn.text}`);
    }
  }
  lines.push(`Nová zpráva od uživatele: ${question}`);
  return lines.join("\n");
}

/** No structured parsing needed — just a non-empty answer. */
export function parseAiAssistantResponse(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function truncateConversationTitle(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > CONVERSATION_TITLE_MAX_LENGTH ? `${trimmed.slice(0, CONVERSATION_TITLE_MAX_LENGTH)}…` : trimmed;
}

export interface AiAssistantConversationSummary {
  conversationId: string;
  /** The earliest user message in the thread, truncated — there's no user-chosen subject to label it by, unlike AI učitel. */
  title: string;
  lastMessageAt: number;
}

/**
 * Groups a member's flat aiAssistantMessages log (any conversation, any
 * order) into one summary per conversationId — most-recently-active first,
 * titled by its earliest user message (by timestamp, not input order, so
 * this works regardless of how the caller fetched the list).
 */
export function summarizeAiAssistantConversations(
  messages: { conversationId: string; role: "user" | "assistant"; text: string; timestamp: number }[]
): AiAssistantConversationSummary[] {
  const byConversation = new Map<string, { title: string; titleAt: number; lastMessageAt: number }>();
  for (const m of messages) {
    const existing = byConversation.get(m.conversationId);
    if (!existing) {
      byConversation.set(m.conversationId, {
        title: m.role === "user" ? truncateConversationTitle(m.text) : "Konverzace",
        titleAt: m.timestamp,
        lastMessageAt: m.timestamp,
      });
      continue;
    }
    if (m.timestamp > existing.lastMessageAt) existing.lastMessageAt = m.timestamp;
    if (m.role === "user" && m.timestamp < existing.titleAt) {
      existing.title = truncateConversationTitle(m.text);
      existing.titleAt = m.timestamp;
    }
  }
  return [...byConversation.entries()]
    .map(([conversationId, v]) => ({ conversationId, title: v.title, lastMessageAt: v.lastMessageAt }))
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}
