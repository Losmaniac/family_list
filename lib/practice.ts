/**
 * Pure logic for the Vzdělání practice module — shared between the client
 * (rendering) and the Cloud Functions that actually generate/verify
 * problems and award XP. Kept dependency-free (no Firestore) so it's fully
 * unit-testable, same reasoning as xp-engine.ts: one source of truth, no
 * answer-checking logic duplicated between client and server.
 */

/**
 * "Vzdělání" is organized by subject. Straight arithmetic generation
 * ("Počítání") was removed — it's trivially bypassed with a calculator, so
 * only genuinely comprehension-based content stays: word/logic problems
 * under Matematika, and language exercises under Čeština/Angličtina.
 */
export interface PracticeSubject {
  id: string;
  label: string;
  available: boolean;
}

export const PRACTICE_SUBJECTS: PracticeSubject[] = [
  { id: "math", label: "Matematika", available: true },
  { id: "czech", label: "Čeština", available: true },
  { id: "english", label: "Angličtina", available: true },
];

/** Flat XP for every correct answer — the daily cap is the only limiter. */
export const PRACTICE_XP_PER_PROBLEM = 1;

/** Max XP a member can earn from this module per day; a parent can raise/lower this later. */
export const DEFAULT_PRACTICE_DAILY_XP_CAP = 50;

/** Wrong answers allowed before the correct answer is revealed and a new problem is required. */
export const PRACTICE_MAX_ATTEMPTS = 3;

export type PracticeDifficulty = 1 | 2 | 3;

export interface LogicWordProblem {
  id: string;
  question: string;
  answer: string;
  difficulty: PracticeDifficulty;
}

// A curated bank of word/logic problems — auto-generating good ones in
// Czech isn't practical, so this stays hand-written and grows over time.
// Deliberately no straight arithmetic ("12 + 7 = ?") — that's what got
// removed; everything here needs the problem itself to be read and
// understood, not just punched into a calculator.
export const LOGIC_WORD_PROBLEMS: LogicWordProblem[] = [
  { id: "lw1", question: "Máš 3 jablka a dostaneš ještě 5. Kolik jablek máš celkem?", answer: "8", difficulty: 1 },
  { id: "lw2", question: "Ve třídě je 10 dětí. 4 jsou kluci. Kolik je holek?", answer: "6", difficulty: 1 },
  { id: "lw3", question: "Anna je starší než Bára, ale mladší než Cyril. Kdo je nejstarší?", answer: "cyril", difficulty: 1 },
  { id: "lw4", question: "Máš 12 sušenek a rozdělíš je stejně mezi 3 kamarády. Kolik dostane každý?", answer: "4", difficulty: 2 },
  { id: "lw5", question: "Vlak jede rychlostí 60 km/h. Jak daleko dojede za 2 hodiny?", answer: "120", difficulty: 2 },
  { id: "lw6", question: "Petr má dvakrát tolik kuliček co Jana. Jana má 7 kuliček. Kolik má Petr?", answer: "14", difficulty: 2 },
  { id: "lw7", question: "Řada čísel: 2, 4, 6, 8, ... Jaké je další číslo?", answer: "10", difficulty: 1 },
  { id: "lw8", question: "Řada čísel: 1, 2, 4, 8, 16, ... Jaké je další číslo?", answer: "32", difficulty: 3 },
  { id: "lw9", question: "Máš 20 Kč. Koupíš si rohlík za 5 Kč a jogurt za 8 Kč. Kolik ti zbyde?", answer: "7", difficulty: 2 },
  { id: "lw10", question: "V pokoji jsou 4 kočky a 2 psi. Kolik mají všechna zvířata dohromady noh?", answer: "24", difficulty: 3 },
  {
    id: "lw11",
    question: "Marek má 3 sourozence. Kolik dětí je celkem v rodině (i s Markem)?",
    answer: "4",
    difficulty: 1,
  },
  {
    id: "lw12",
    question: "Kniha má 240 stran. Přečetl jsi polovinu. Kolik stran ti ještě zbývá?",
    answer: "120",
    difficulty: 2,
  },
  {
    id: "lw13",
    question: "Autobus odjíždí v 8:15 a jízda trvá 45 minut. V kolik hodin dorazí?",
    answer: "9:00",
    difficulty: 2,
  },
  {
    id: "lw14",
    question: "Tři kamarádi si rozdělí 27 bonbonů rovným dílem. Kolik dostane každý?",
    answer: "9",
    difficulty: 2,
  },
  {
    id: "lw15",
    question: "Řada čísel: 3, 6, 9, 12, ... Jaké je další číslo?",
    answer: "15",
    difficulty: 1,
  },
  {
    id: "lw16",
    question: "Řada čísel: 100, 90, 80, 70, ... Jaké je další číslo?",
    answer: "60",
    difficulty: 1,
  },
  {
    id: "lw17",
    question: "V akváriu je dvakrát víc rybiček než šneků. Šneků je 5. Kolik je tam rybiček?",
    answer: "10",
    difficulty: 2,
  },
  {
    id: "lw18",
    question: "Tomáš je vyšší než Eva, Eva je vyšší než Filip. Kdo je nejnižší?",
    answer: "filip",
    difficulty: 1,
  },
  {
    id: "lw19",
    question: "Máš 50 Kč a chceš koupit 3 tužky po 8 Kč. Kolik ti zbyde?",
    answer: "26",
    difficulty: 2,
  },
  {
    id: "lw20",
    question: "Za hodinu ujde turista 5 km. Kolik kilometrů ujde za 3 hodiny stejným tempem?",
    answer: "15",
    difficulty: 2,
  },
  {
    id: "lw21",
    question: "V krabici je 8 tužek a 6 pastelek. Kolik věcí je v krabici celkem?",
    answer: "14",
    difficulty: 1,
  },
  {
    id: "lw22",
    question: "Když sudé číslo vydělíš 2, dostaneš liché číslo 7. Jaké bylo původní sudé číslo?",
    answer: "14",
    difficulty: 3,
  },
  {
    id: "lw23",
    question: "Čtverec má obvod 20 cm. Jak dlouhá je jedna jeho strana?",
    answer: "5",
    difficulty: 3,
  },
  {
    id: "lw24",
    question: "Ondra měl 15 samolepek, 6 daroval kamarádovi a pak dostal ještě 4. Kolik má teď?",
    answer: "13",
    difficulty: 2,
  },
  {
    id: "lw25",
    question: "Ve fotbalovém týmu je 11 hráčů. Přišli ještě 2 náhradníci. Kolik je jich teď celkem?",
    answer: "13",
    difficulty: 1,
  },
  {
    id: "lw26",
    question: "Pekař upekl 60 rohlíků a prodal 3/4 z nich. Kolik rohlíků mu zbylo?",
    answer: "15",
    difficulty: 3,
  },
  {
    id: "lw27",
    question: "Řada čísel: 1, 4, 9, 16, ... (druhé mocniny). Jaké je další číslo?",
    answer: "25",
    difficulty: 3,
  },
  {
    id: "lw28",
    question: "Kuba má o 5 Kč víc než Lenka. Lenka má 23 Kč. Kolik má Kuba?",
    answer: "28",
    difficulty: 1,
  },
  {
    id: "lw29",
    question: "Filmové představení začíná v 17:40 a trvá 100 minut. V kolik hodin skončí?",
    answer: "19:20",
    difficulty: 3,
  },
  {
    id: "lw30",
    question: "Zahrada je obdélník 12 m × 5 m. Jaký je její obsah v metrech čtverečních?",
    answer: "60",
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
