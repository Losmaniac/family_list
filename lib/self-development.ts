/**
 * "Seberozvoj" (self-development) practice content for the Vzdělání
 * module — emotions, habits, goal-setting, communication, resilience.
 * Hand-written for the same reason as lib/czech-language.ts — every
 * answer needs to be short and unambiguous enough to auto-grade, so this
 * sticks to concrete vocabulary/definitions rather than open reflection.
 */

export interface SelfDevelopmentExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
}

export const SELF_DEVELOPMENT_EXERCISES: SelfDevelopmentExercise[] = [
  // Emoce
  { id: "sr1", question: "Jak se nazývá schopnost rozpoznat a pojmenovat vlastní pocity?", answer: ["sebeuvědomění", "emoční inteligence"] },
  { id: "sr2", question: "Jak se říká pocitu, který máš, když se ti něco povede a jsi na sebe hrdý?", answer: ["hrdost", "pýcha"] },
  { id: "sr3", question: "Jak se nazývá schopnost vžít se do pocitů druhého člověka?", answer: "empatie" },
  { id: "sr4", question: "Když se rozzlobíš, pár hlubokých nádechů ti může pomoct se…?", answer: ["uklidnit", "zklidnit"] },
  // Návyky a cíle
  { id: "sr5", question: "Jak se nazývá činnost, kterou děláš pravidelně, aniž bys nad ní musel/a moc přemýšlet?", answer: "návyk" },
  { id: "sr6", question: "Jak se říká něčemu, čeho chceš v budoucnu dosáhnout?", answer: "cíl" },
  { id: "sr7", question: "Jak se nazývá seznam úkolů podle důležitosti a času, který si naplánuješ?", answer: ["plán", "rozvrh"] },
  {
    id: "sr8",
    question: "Jak se nazývá schopnost dokončit něco těžkého, i když tě to nebaví?",
    answer: ["vytrvalost", "houževnatost"],
  },
  {
    id: "sr9",
    question: "Jak se říká odkládání úkolů na později, i když bys je měl/a udělat hned?",
    answer: "prokrastinace",
  },
  // Komunikace
  { id: "sr10", question: "Jak se nazývá pozorné poslouchání druhého člověka, aniž bys mu skákal/a do řeči?", answer: ["aktivní naslouchání", "naslouchání"] },
  { id: "sr11", question: "Jak se říká upřímnému, ale slušnému sdělení vlastního názoru?", answer: "asertivita" },
  { id: "sr12", question: "Když uděláš chybu a řekneš druhému „promiň“, čemu se to říká?", answer: "omluva" },
  // Odolnost a chyby
  {
    id: "sr13",
    question: "Jak se nazývá schopnost zvládat těžké situace a nevzdávat se?",
    answer: ["odolnost", "houževnatost"],
  },
  { id: "sr14", question: "Chyba, ze které se něco naučíš, se dá nazvat jako… (jedno slovo)", answer: "zkušenost" },
  {
    id: "sr15",
    question: "Jak se nazývá víra ve vlastní schopnosti něco zvládnout?",
    answer: "sebedůvěra",
  },
  // Zdravé návyky
  { id: "sr16", question: "Kolik hodin spánku denně se doporučuje dítěti ve školním věku (přibližně)?", answer: ["9", "10"] },
  {
    id: "sr17",
    question: "Jak se nazývá čas, kdy si od povinností odpočineš a nabereš síly?",
    answer: ["odpočinek", "relaxace"],
  },
  {
    id: "sr18",
    question: "Jak se říká pravidelnému pohybu, který prospívá tělu i mysli?",
    answer: ["cvičení", "pohyb"],
  },
  // Time management
  { id: "sr19", question: "Rozdělení velkého úkolu na menší kroky se nazývá…?", answer: ["plánování", "rozdělení úkolu"] },
  {
    id: "sr20",
    question: "Máš na úkol 60 minut a už jsi pracoval/a 25 minut. Kolik minut ti zbývá?",
    answer: "35",
  },
  {
    id: "sr21",
    question: "Jak se nazývá krátká přestávka mezi dvěma úkoly, aby sis odpočinul/a?",
    answer: ["pauza", "přestávka"],
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomSelfDevelopmentExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): SelfDevelopmentExercise | undefined {
  const pool = excludeIds ? SELF_DEVELOPMENT_EXERCISES.filter((e) => !excludeIds.has(e.id)) : SELF_DEVELOPMENT_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}
