/**
 * "Finanční gramotnost" (financial literacy) practice content for the
 * Vzdělání module — money basics, saving, budgeting, needs vs. wants,
 * banking. Hand-written for the same reason as lib/czech-language.ts —
 * real subject-matter knowledge, not something a generator could produce
 * correctly, and every answer needs to be short enough to auto-grade.
 */

export interface FinancialLiteracyExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
}

export const FINANCIAL_LITERACY_EXERCISES: FinancialLiteracyExercise[] = [
  // Základní pojmy
  { id: "fg1", question: "Jak se jmenuje česká měna?", answer: ["koruna", "česká koruna"] },
  { id: "fg2", question: "Kolik haléřů/setin je v jedné koruně (dnes už se nepoužívají, ale početně)?", answer: "100" },
  { id: "fg3", question: "Jak se nazývá peníz, který si šetříš a nevydáváš hned?", answer: "úspora" },
  { id: "fg4", question: "Jak se říká plánu, kolik peněz vyděláš a kolik utratíš za měsíc?", answer: "rozpočet" },
  { id: "fg5", question: "Jak se nazývá pravidelná odměna, kterou dostává dospělý za práci?", answer: ["mzda", "plat"] },
  { id: "fg6", question: "Jak se jmenuje instituce, kde si lidé ukládají peníze a mohou si i půjčit?", answer: "banka" },
  { id: "fg7", question: "Jak se nazývá místo na spoření peněz v bance, kam si ukládáš úspory?", answer: ["spořicí účet", "účet"] },
  // Potřeby vs. přání
  {
    id: "fg8",
    question: "Jídlo, bydlení a oblečení jsou příklady čeho — věcí, bez kterých se neobejdeš?",
    answer: "potřeby",
  },
  {
    id: "fg9",
    question: "Nová hračka, kterou nutně nepotřebuješ, ale chceš ji — je to potřeba, nebo…?",
    answer: "přání",
  },
  // Počítání s penězi
  { id: "fg10", question: "Máš 100 Kč a utratíš 35 Kč. Kolik ti zbyde?", answer: "65" },
  { id: "fg11", question: "Chceš si koupit hračku za 250 Kč. Máš našetřeno 90 Kč. Kolik ti ještě chybí?", answer: "160" },
  { id: "fg12", question: "Každý týden si ušetříš 50 Kč. Kolik naspoříš za 4 týdny?", answer: "200" },
  { id: "fg13", question: "Rohlík stojí 6 Kč. Kolik zaplatíš za 5 rohlíků?", answer: "30" },
  { id: "fg14", question: "Máš 500 Kč. Utratíš polovinu. Kolik ti zůstane?", answer: "250" },
  // Práce s penězi, dluhy, úroky
  {
    id: "fg15",
    question: "Jak se nazývá peníz navíc, který musíš zaplatit, když si peníze půjčíš (např. v bance)?",
    answer: "úrok",
  },
  { id: "fg16", question: "Jak se nazývá to, když dlužíš někomu peníze?", answer: "dluh" },
  {
    id: "fg17",
    question: "Jak se jmenuje karta, kterou lze platit v obchodě místo hotovosti?",
    answer: ["platební karta", "karta"],
  },
  {
    id: "fg18",
    question: "Jak se nazývá situace, kdy vydáváš víc peněz, než vyděláš?",
    answer: ["zadlužení", "dluh"],
  },
  // Chytré nakupování
  {
    id: "fg19",
    question: "Jak se nazývá dočasné snížení ceny zboží v obchodě?",
    answer: ["sleva", "akce"],
  },
  {
    id: "fg20",
    question: "Než si něco koupíš, je chytré porovnat ceny na víc místech. Jak se tomu říká?",
    answer: ["porovnání cen", "srovnání cen"],
  },
  {
    id: "fg21",
    question: "Jak se nazývá papír/doklad, který dostaneš v obchodě jako potvrzení nákupu?",
    answer: ["účtenka", "paragon"],
  },
  // Dárky, kapesné
  {
    id: "fg22",
    question: "Jak se nazývají peníze, které dítě pravidelně dostává od rodičů na vlastní útratu?",
    answer: "kapesné",
  },
  {
    id: "fg23",
    question: "Máš dostávat 100 Kč kapesného měsíčně. Kolik dostaneš za půl roku?",
    answer: "600",
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomFinancialLiteracyExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): FinancialLiteracyExercise | undefined {
  const pool = excludeIds ? FINANCIAL_LITERACY_EXERCISES.filter((e) => !excludeIds.has(e.id)) : FINANCIAL_LITERACY_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}
