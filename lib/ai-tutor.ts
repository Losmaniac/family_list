/**
 * "AI učitel" — an open-ended tutoring chat (functions/src/aiTutor.ts calls
 * Gemini/OpenRouter, same provider fallback as AI otázky/weeklyDigest; the
 * key never reaches the client). Unlike AI otázky, the subject isn't picked
 * from a fixed list — free text, so this works equally well for a school
 * topic or something an adult wants explained, and there's no XP attached
 * to it at all, since it's a study aid, not a graded exercise.
 */
import { CZECH_QUALITY_INSTRUCTION } from "./ai-quiz";

export const AI_TUTOR_DEPTHS = [
  { value: "basics", label: "Základy", description: "Vysvětli od podstaty, jako úplný začátek — nic nepředpokládej." },
  { value: "intermediate", label: "Střední úroveň", description: "Předpokládej základní znalosti tématu, jdi o kus dál." },
  { value: "advanced", label: "Pokročilá", description: "Do hloubky, včetně souvislostí a výjimek — klidně náročnější slovník." },
] as const;
export type AiTutorDepth = (typeof AI_TUTOR_DEPTHS)[number]["value"];

export const AI_TUTOR_MODES = [
  { value: "explain", label: "Vysvětlit", description: "Trpělivé vysvětlení pojmu nebo tématu, krok za krokem, s příkladem." },
  { value: "quiz", label: "Procvičit otázkami", description: "Klade ti otázky k tématu jednu po druhé a reaguje na tvoje odpovědi." },
  { value: "homework", label: "Pomoc s úkolem", description: "Popiš svůj úkol nebo problém — nechá tě na řešení přijít nápovědami, nerovnou ho neprozradí." },
] as const;
export type AiTutorMode = (typeof AI_TUTOR_MODES)[number]["value"];

export function aiTutorDepthLabel(value: string): string {
  return AI_TUTOR_DEPTHS.find((d) => d.value === value)?.label ?? AI_TUTOR_DEPTHS[0].label;
}

export function aiTutorModeLabel(value: string): string {
  return AI_TUTOR_MODES.find((m) => m.value === value)?.label ?? AI_TUTOR_MODES[0].label;
}

export const MAX_AI_TUTOR_SUBJECT_LENGTH = 80;
export const MAX_AI_TUTOR_QUESTION_LENGTH = 1000;
/** How many previous turns are fed back into the prompt as conversation context — older history is dropped, not summarized. */
export const MAX_AI_TUTOR_HISTORY = 12;

export interface AiTutorHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

/** Trims/collapses whitespace and rejects empty or too-long subjects. Shared by client (UX) and server (actual enforcement). */
export function normalizeAiTutorSubject(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > MAX_AI_TUTOR_SUBJECT_LENGTH) return null;
  return trimmed;
}

export function buildAiTutorPrompt(
  subject: string,
  depth: AiTutorDepth,
  mode: AiTutorMode,
  history: AiTutorHistoryMessage[],
  question: string
): string {
  const depthInfo = AI_TUTOR_DEPTHS.find((d) => d.value === depth) ?? AI_TUTOR_DEPTHS[0];
  const modeInfo = AI_TUTOR_MODES.find((m) => m.value === mode) ?? AI_TUTOR_MODES[0];

  const lines = [
    CZECH_QUALITY_INSTRUCTION,
    `Jsi trpělivý a přátelský lektor na téma "${subject}".`,
    `Cílová hloubka vysvětlení: ${depthInfo.label} — ${depthInfo.description}`,
    `Styl odpovědi: ${modeInfo.label} — ${modeInfo.description}`,
    "Odpovídej stručně a srozumitelně — spíš kratší odpověď s nabídkou doptat se, než jedna vyčerpávající esej. Markdown používej jen střídmě (tučně pro klíčové pojmy, odrážky pro výčty), žádné nadpisy.",
  ];

  if (mode === "quiz") {
    lines.push("Polož vždy jen JEDNU otázku najednou a počkej na odpověď — nikdy nechrli víc otázek najednou.");
  }
  if (mode === "homework") {
    lines.push(
      'Nikdy rovnou nenapiš celé hotové řešení — veď uživatele nápovědami a otázkami, ať na to přijde sám. Pokud o to výslovně požádá ("řekni mi rovnou odpověď"), teprve pak mu ji řekni.'
    );
  }

  if (history.length > 0) {
    lines.push("Dosavadní konverzace (jen pro kontext, needpovídej na ni znovu):");
    for (const turn of history) {
      lines.push(`${turn.role === "user" ? "Uživatel" : "Lektor"}: ${turn.text}`);
    }
  }

  lines.push(`Nová zpráva od uživatele: ${question}`);
  return lines.join("\n");
}

/** The model's reply needs no structured parsing (unlike AI otázky's strict JSON) — just a non-empty answer. */
export function parseAiTutorResponse(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The conversation's opening turn — sent automatically the moment a
 * subject is picked, so the user gets a general explanation straight away
 * instead of having to type a first question themselves. Phrased as if the
 * user asked it (still stored as a normal "user" message) so the thread
 * reads naturally on replay, just auto-sent rather than typed.
 */
export function buildAiTutorKickoffMessage(subject: string, mode: AiTutorMode): string {
  if (mode === "quiz") return `Začni se mnou procvičovat téma "${subject}" — polož mi první otázku.`;
  if (mode === "homework") return `Obecně mi vysvětli téma "${subject}", ať do něj mám vhled, než se pustím do úkolu.`;
  return `Vysvětli mi téma "${subject}".`;
}

export interface AiTutorThreadSummary {
  subject: string;
  lastMessageText: string;
  lastMessageAt: number;
  depth: AiTutorDepth;
  mode: AiTutorMode;
}

/**
 * Groups a member's flat aiTutorMessages log (any subject, any order) into
 * one summary per distinct subject — the most recent message decides the
 * preview text and, since depth/mode are recorded per message, which
 * settings "pokračovat" resumes with. Sorted most-recently-active first.
 * A message from before depth/mode existed falls back to each list's first
 * (default) option, same as the server does for a missing snapshot elsewhere.
 */
export function summarizeAiTutorThreads(
  messages: { subject: string; text: string; timestamp: number; depth?: AiTutorDepth; mode?: AiTutorMode }[]
): AiTutorThreadSummary[] {
  const bySubject = new Map<string, AiTutorThreadSummary>();
  for (const m of messages) {
    const existing = bySubject.get(m.subject);
    if (existing && existing.lastMessageAt >= m.timestamp) continue;
    bySubject.set(m.subject, {
      subject: m.subject,
      lastMessageText: m.text,
      lastMessageAt: m.timestamp,
      depth: m.depth ?? AI_TUTOR_DEPTHS[0].value,
      mode: m.mode ?? AI_TUTOR_MODES[0].value,
    });
  }
  return [...bySubject.values()].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}
