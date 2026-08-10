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

/** Strict-JSON-only instructions — parseAiQuizResponse only ever accepts exactly this shape, so the prompt has to be unambiguous about it. */
export function buildAiQuizPrompt(topicLabel: string): string {
  return [
    "Jsi generátor vzdělávacích kvízových otázek pro děti ve věku 8-14 let.",
    `Vytvoř JEDNU otázku s výběrem odpovědí na téma "${topicLabel}" v češtině, přiměřeně obtížnou pro tento věk.`,
    "Odpověz VÝHRADNĚ validním JSON objektem v tomto přesném tvaru, bez jakéhokoliv dalšího textu a bez markdown bloků:",
    '{"question": "text otázky", "options": ["možnost A", "možnost B", "možnost C"], "correctIndex": 0}',
    '"correctIndex" je index (0, 1 nebo 2) správné možnosti v poli "options". Možnosti musí být krátké, jednoznačné a jen jedna z nich smí být správně.',
  ].join("\n");
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
