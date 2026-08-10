/**
 * "AI otázky" — a Vzdělání subject whose questions aren't a fixed bank at
 * all, but generated on demand by Gemini (functions/src/aiQuiz.ts calls
 * the API; the key never reaches the client). Kept dependency-free here so
 * prompt-building and response-parsing are unit-testable without a live
 * API call — the actual fetch() only happens server-side.
 */

export interface AiQuizTopic {
  id: string;
  label: string;
}

export const AI_QUIZ_TOPICS: AiQuizTopic[] = [
  { id: "math", label: "Matematika" },
  { id: "czech", label: "Čeština" },
  { id: "prirodoveda", label: "Přírodověda" },
  { id: "vlastiveda", label: "Vlastivěda" },
  { id: "english", label: "Angličtina" },
  { id: "geography", label: "Zeměpis" },
  { id: "finance", label: "Finanční gramotnost" },
  { id: "digisafety", label: "Digitální bezpečnost" },
];

/**
 * How many *consecutive* correct answers on a topic map to how hard the
 * next question should be — so a child who keeps getting a topic right
 * gets pushed progressively further, instead of drilling the same easy
 * level forever. Resets to 0 on any wrong answer (see submitAiQuizAnswer).
 */
export function difficultyLabelForStreak(streak: number): string {
  if (streak >= 8) return "expertní — na hranici učiva druhého stupně, klidně méně známý detail, souvislost mezi předměty nebo chyták";
  if (streak >= 5) return "obtížná — látka vyšších ročníků druhého stupně, vyžaduje přemýšlení a souvislosti, ne jen zapamatovaná fakta";
  if (streak >= 2) return "středně obtížná — běžné učivo druhého stupně, ne jen memorování";
  return "přiměřená úrovni druhého stupně základní školy (5.–9. třída) — rozhodně ne triviální ani pro nejmladší děti, ale zvládnutelná bez pokročilých znalostí";
}

/**
 * Prepended to every prompt — some OpenRouter models (unlike Gemini, which
 * is naturally strong in Czech) otherwise produce Czech with declension/
 * conjugation mistakes, since it's a small fraction of their training data.
 */
const CZECH_QUALITY_INSTRUCTION =
  'Jsi český asistent. Tvým úkolem je odpovídat výhradně v plynulé, spisovné a gramaticky absolutně správné češtině. Zkontroluj si skloňování a časování slov předtím, než vypíšeš odpověď.';

/** Strict-JSON-only instructions — parseAiQuizResponse only ever accepts exactly this shape, so the prompt has to be unambiguous about it. */
export function buildAiQuizPrompt(topicLabel: string, difficultyLabel: string = difficultyLabelForStreak(0)): string {
  return [
    CZECH_QUALITY_INSTRUCTION,
    "Jsi generátor vzdělávacích kvízových otázek pro žáky druhého stupně základní školy (přibližně 10-15 let, 5.-9. třída). Otázky nesmí být primitivní ani triviální — cílíš na úroveň druhého stupně, ne na úplné začátečníky.",
    `Vytvoř JEDNU otázku s výběrem odpovědí na téma "${topicLabel}" v češtině.`,
    `Obtížnost otázky: ${difficultyLabel}.`,
    "Odpověz VÝHRADNĚ validním JSON objektem v tomto přesném tvaru, bez jakéhokoliv dalšího textu a bez markdown bloků:",
    '{"question": "text otázky", "options": ["možnost A", "možnost B", "možnost C"], "correctIndex": 0}',
    '"correctIndex" je index (0, 1 nebo 2) správné možnosti v poli "options". Možnosti musí být krátké, jednoznačné a jen jedna z nich smí být správně.',
  ].join("\n");
}

/** The pseudo-topic id for a user-typed subject — not in AI_QUIZ_TOPICS since it has no fixed label. */
export const CUSTOM_TOPIC_ID = "custom";
export const MAX_CUSTOM_TOPIC_LENGTH = 60;

/** Trims/collapses whitespace and rejects empty or too-long custom topics. Shared by client (UX) and server (actual enforcement). */
export function normalizeCustomTopic(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > MAX_CUSTOM_TOPIC_LENGTH) return null;
  return trimmed;
}

/**
 * Difficulty streaks are tracked per topic. Built-in topics use their id
 * directly; a custom topic is bucketed by its (lowercased) text so asking
 * about "dinosauři" repeatedly still ramps up, while a different custom
 * topic starts back at the base difficulty.
 */
export function streakKeyForTopic(topicId: string, customTopic?: string | null): string {
  if (topicId === CUSTOM_TOPIC_ID && customTopic) {
    return `custom:${customTopic.toLowerCase()}`;
  }
  return topicId;
}

export interface ParsedAiQuizQuestion {
  question: string;
  options: [string, string, string];
  answer: string;
}

/** Strips a ```json ... ``` (or plain ``` ... ```) fence Gemini sometimes wraps its output in, despite being told not to. */
function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export function parseAiQuizResponse(raw: string): ParsedAiQuizQuestion | null {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const { question, options, correctIndex } = data as Record<string, unknown>;
  if (typeof question !== "string" || !question.trim()) return null;
  if (!Array.isArray(options) || options.length !== 3) return null;
  if (!options.every((o) => typeof o === "string" && o.trim())) return null;
  if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 2) return null;

  const opts = options as [string, string, string];
  return { question: question.trim(), options: opts, answer: opts[correctIndex] };
}

/** Fisher-Yates on exactly 3 items — so the correct answer isn't predictably always in the same slot. `random` is injectable for deterministic tests. */
export function shuffleThree<T>(items: [T, T, T], random: () => number = Math.random): [T, T, T] {
  const arr = [...items] as [T, T, T];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
