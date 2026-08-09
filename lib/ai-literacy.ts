/**
 * "AI" (artificial intelligence literacy) practice content for the
 * Vzdělání module — what AI is and isn't, everyday examples, how it
 * learns, and basic safety/ethics for kids using it. Hand-written for the
 * same reason as lib/czech-language.ts — every answer needs to be short
 * and unambiguous enough to auto-grade.
 */

export interface AiLiteracyExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
}

export const AI_LITERACY_EXERCISES: AiLiteracyExercise[] = [
  // Základní pojmy
  { id: "ai1", question: "Co znamená zkratka AI (anglicky)?", answer: ["artificial intelligence", "umělá inteligence"] },
  { id: "ai2", question: "Jak se česky řekne „artificial intelligence“?", answer: "umělá inteligence" },
  {
    id: "ai3",
    question: "Program, který umí odpovídat na otázky a bavit se s tebou jako člověk, se nazývá jak?",
    answer: ["chatbot", "chatbot/asistent", "asistent"],
  },
  {
    id: "ai4",
    question: "Jak se nazývá to, když počítač „trénuje“ na velkém množství dat, aby se něco naučil?",
    answer: ["strojové učení", "trénování"],
  },
  {
    id: "ai5",
    question: "Jak se nazývají velké soubory informací, ze kterých se AI učí?",
    answer: "data",
  },
  // Příklady AI v běžném životě
  {
    id: "ai6",
    question: "Jak se nazývá funkce v telefonu, která tě pozná podle tváře a odemkne ti obrazovku?",
    answer: ["rozpoznávání obličeje", "rozpoznání obličeje"],
  },
  {
    id: "ai7",
    question: "Jak se nazývá funkce, která ti na YouTube nebo v aplikacích doporučuje další videa/písničky podle toho, co sis pouštěl/a dřív?",
    answer: ["doporučovací systém", "doporučení"],
  },
  {
    id: "ai8",
    question: "Jak se nazývá program, který umí automaticky přeložit text z jednoho jazyka do druhého?",
    answer: "překladač",
  },
  // Jak AI funguje (zjednodušeně)
  {
    id: "ai9",
    question: "Umí AI sama přemýšlet a mít vlastní pocity jako člověk? (ano/ne)",
    answer: "ne",
  },
  {
    id: "ai10",
    question: "AI se neučí odpovídat sama od sebe, ale z velkého množství čeho, co jí lidé dodali?",
    answer: "data",
  },
  {
    id: "ai11",
    question: "Když AI napíše odpověď, která zní jistě, ale je ve skutečnosti špatně, jak se tomu říká?",
    answer: ["halucinace", "chyba"],
  },
  // Bezpečnost a etika pro děti
  {
    id: "ai12",
    question: "Měl/a bys AI chatbotovi posílat svoje skutečné jméno, adresu nebo heslo? (ano/ne)",
    answer: "ne",
  },
  {
    id: "ai13",
    question: "Když ti AI dá radu nebo informaci, měl/a bys jí vždycky bezmyšlenkovitě věřit, nebo si to ověřit? (odpověz: ověřit)",
    answer: "ověřit",
  },
  {
    id: "ai14",
    question: "Jak se nazývá obrázek nebo video vytvořené počítačem, které vypadá jako skutečné, ale není?",
    answer: ["deepfake", "generovaný obrázek"],
  },
  {
    id: "ai15",
    question: "Je v pořádku vydávat práci vytvořenou AI za úplně vlastní ve škole bez upozornění učitele? (ano/ne)",
    answer: "ne",
  },
  // Roboti a AI
  {
    id: "ai16",
    question: "Je robot vždycky totéž co umělá inteligence? (ano/ne)",
    answer: "ne",
  },
  {
    id: "ai17",
    question: "Jak se nazývá stroj, který umí sám vykonávat fyzické úkoly (např. uklízet nebo skládat věci)?",
    answer: "robot",
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomAiLiteracyExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): AiLiteracyExercise | undefined {
  const pool = excludeIds ? AI_LITERACY_EXERCISES.filter((e) => !excludeIds.has(e.id)) : AI_LITERACY_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}
