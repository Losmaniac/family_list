/**
 * Pure logic for the "Příklady" practice module (math/logic/word problems
 * for XP) — shared between the client (rendering) and the Cloud Functions
 * that actually generate/verify problems and award XP. Kept dependency-free
 * (no Firestore) so it's fully unit-testable, same reasoning as xp-engine.ts:
 * one source of truth, no XP/answer logic duplicated between client and server.
 */

export type PracticeDifficulty = 1 | 2 | 3;

export const PRACTICE_DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  1: "Lehké",
  2: "Střední",
  3: "Těžké",
};

/** XP awarded per correct answer, by difficulty — small on purpose since the daily cap is the real limiter. */
export const PRACTICE_XP_REWARD: Record<PracticeDifficulty, number> = {
  1: 1,
  2: 2,
  3: 3,
};

/** Max XP a member can earn from this module per day; a parent can raise/lower this later. */
export const DEFAULT_PRACTICE_DAILY_XP_CAP = 50;

/** Wrong answers allowed before the correct answer is revealed and a new problem is required. */
export const PRACTICE_MAX_ATTEMPTS = 3;

export interface MathProblem {
  operandA: number;
  operandB: number;
  operator: "+" | "-" | "×" | "÷";
  question: string;
  correctAnswer: number;
}

/**
 * `random` is injectable (defaults to Math.random) purely so tests can pass
 * a deterministic sequence instead of mocking the global.
 */
export function generateMathProblem(difficulty: PracticeDifficulty, random: () => number = Math.random): MathProblem {
  function randInt(min: number, max: number): number {
    return min + Math.floor(random() * (max - min + 1));
  }

  if (difficulty === 1) {
    const operator = random() < 0.5 ? "+" : "-";
    let a = randInt(1, 10);
    let b = randInt(1, 10);
    if (operator === "-" && b > a) [a, b] = [b, a]; // keep it non-negative for the easiest tier
    const correctAnswer = operator === "+" ? a + b : a - b;
    return { operandA: a, operandB: b, operator, question: `${a} ${operator} ${b} = ?`, correctAnswer };
  }

  if (difficulty === 2) {
    const operator = (["+", "-", "×"] as const)[randInt(0, 2)];
    if (operator === "×") {
      const a = randInt(2, 12);
      const b = randInt(2, 12);
      return { operandA: a, operandB: b, operator, question: `${a} × ${b} = ?`, correctAnswer: a * b };
    }
    let a = randInt(10, 99);
    let b = randInt(10, 99);
    if (operator === "-" && b > a) [a, b] = [b, a];
    const correctAnswer = operator === "+" ? a + b : a - b;
    return { operandA: a, operandB: b, operator, question: `${a} ${operator} ${b} = ?`, correctAnswer };
  }

  // difficulty === 3
  const operator = random() < 0.5 ? "×" : "÷";
  if (operator === "×") {
    const a = randInt(6, 20);
    const b = randInt(6, 20);
    return { operandA: a, operandB: b, operator, question: `${a} × ${b} = ?`, correctAnswer: a * b };
  }
  // Division: build from a clean multiplication so the result is always a whole number.
  const divisor = randInt(2, 12);
  const quotient = randInt(2, 12);
  const dividend = divisor * quotient;
  return { operandA: dividend, operandB: divisor, operator, question: `${dividend} ÷ ${divisor} = ?`, correctAnswer: quotient };
}

export interface LogicWordProblem {
  id: string;
  question: string;
  answer: string;
  difficulty: PracticeDifficulty;
}

// A small curated bank — auto-generating good logic/word problems in Czech
// isn't practical, so this stays hand-written and can grow over time.
export const LOGIC_WORD_PROBLEMS: LogicWordProblem[] = [
  { id: "lw1", question: "Máš 3 jablka a dostaneš ještě 5. Kolik jablek máš celkem?", answer: "8", difficulty: 1 },
  { id: "lw2", question: "Ve třídě je 10 dětí. 4 jsou kluci. Kolik je holek?", answer: "6", difficulty: 1 },
  { id: "lw3", question: "Anna je starší než Bára, ale mladší než Cyril. Kdo je nejstarší?", answer: "cyril", difficulty: 1 },
  { id: "lw4", question: "Máš 12 sušenek a rozdělíš je stejně mezi 3 kamarády. Kolik dostane každý?", answer: "4", difficulty: 2 },
  {
    id: "lw5",
    question: "Vlak jede rychlostí 60 km/h. Jak daleko dojede za 2 hodiny?",
    answer: "120",
    difficulty: 2,
  },
  {
    id: "lw6",
    question: "Petr má dvakrát tolik kuliček co Jana. Jana má 7 kuliček. Kolik má Petr?",
    answer: "14",
    difficulty: 2,
  },
  {
    id: "lw7",
    question: "Řada čísel: 2, 4, 6, 8, ... Jaké je další číslo?",
    answer: "10",
    difficulty: 1,
  },
  {
    id: "lw8",
    question: "Řada čísel: 1, 2, 4, 8, 16, ... Jaké je další číslo?",
    answer: "32",
    difficulty: 3,
  },
  {
    id: "lw9",
    question: "Máš 20 Kč. Koupíš si rohlík za 5 Kč a jogurt za 8 Kč. Kolik ti zbyde?",
    answer: "7",
    difficulty: 2,
  },
  {
    id: "lw10",
    question: "V pokoji jsou 4 kočky a 2 psi. Kolik mají všechna zvířata dohromady noh?",
    answer: "24",
    difficulty: 3,
  },
];

export function pickRandomLogicWordProblem(
  difficulty?: PracticeDifficulty,
  random: () => number = Math.random
): LogicWordProblem {
  const pool = difficulty ? LOGIC_WORD_PROBLEMS.filter((p) => p.difficulty === difficulty) : LOGIC_WORD_PROBLEMS;
  const list = pool.length > 0 ? pool : LOGIC_WORD_PROBLEMS;
  return list[Math.floor(random() * list.length)];
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAnswerCorrect(submitted: string, correctAnswer: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(correctAnswer);
}
