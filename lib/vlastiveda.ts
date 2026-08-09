/**
 * "Vlastivěda" (geography + history of the Czech Republic) practice
 * content for the Vzdělání module — standard 5th-grade "Člověk a jeho
 * svět" curriculum (RVP ZV). Hand-written for the same reason as
 * lib/czech-language.ts and lib/prirodoveda.ts.
 */

export interface VlastivedaExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
}

export const VLASTIVEDA_EXERCISES: VlastivedaExercise[] = [
  // Geografie ČR
  { id: "vl1", question: "Jak se jmenuje hlavní město České republiky?", answer: "praha" },
  { id: "vl2", question: "Jaká řeka protéká Prahou?", answer: "vltava" },
  { id: "vl3", question: "Jak se jmenuje nejdelší řeka v Česku?", answer: "vltava" },
  { id: "vl4", question: "Jak se jmenuje nejvyšší hora České republiky?", answer: "sněžka" },
  { id: "vl5", question: "V jakém pohoří leží Sněžka?", answer: "krkonoše" },
  { id: "vl6", question: "Jaký je oficiální název naší měny?", answer: ["koruna", "česká koruna"] },
  { id: "vl7", question: "Kolik krajů má Česká republika?", answer: "14" },
  // Any one of the four is a correct answer — the question itself only
  // asks for one, so accepting just "Německo" was marking three equally
  // correct answers wrong.
  { id: "vl8", question: "Jmenuj jeden stát, který sousedí s Českou republikou.", answer: ["německo", "polsko", "rakousko", "slovensko"] },
  { id: "vl9", question: "Jak se jmenuje řeka, která protéká Ostravou a vlévá se do Baltského moře?", answer: "odra" },
  { id: "vl10", question: "Jak se nazývá řeka, která protéká východními Čechami a je druhá nejdelší v ČR (vlévá se do ní Vltava)?", answer: "labe" },
  { id: "vl11", question: "Ve kterém kraji leží město Brno?", answer: ["jihomoravský", "jihomoravský kraj"] },
  { id: "vl12", question: "Jak se jmenuje pohoří na hranici s Německem, kde roste hodně smrkových lesů (dřív se mu říkalo kvůli lesům)?", answer: "šumava" },
  // Historie
  {
    id: "vl13",
    question: "Jak se jmenoval český král a římský císař ze 14. století, kterému se přezdívá „Otec vlasti“?",
    answer: ["karel iv", "karel iv.", "karel čtvrtý"],
  },
  { id: "vl14", question: "Jak se jmenoval kněz upálený v roce 1415 za své názory, po kterém je pojmenováno husitské hnutí?", answer: "jan hus" },
  { id: "vl15", question: "V jakém roce vznikla samostatná Československá republika?", answer: "1918" },
  {
    id: "vl16",
    question: "Jak se jmenoval první prezident Československa?",
    answer: ["tomáš garrigue masaryk", "tomáš masaryk", "t. g. masaryk", "tgm", "masaryk"],
  },
  { id: "vl17", question: "V jakém roce proběhla sametová revoluce v Československu?", answer: "1989" },
  { id: "vl18", question: "V jakém roce se Československo rozdělilo na Českou republiku a Slovensko?", answer: "1993" },
  { id: "vl19", question: "Jak se jmenuje nejstarší kamenný most v Praze přes Vltavu?", answer: "karlův most" },
  { id: "vl20", question: "Jak se jmenuje hrad v centru Prahy, kde sídlí prezident?", answer: "pražský hrad" },
  // Symboly a společnost
  { id: "vl21", question: "Jaké zvíře je na státním znaku České republiky?", answer: "lev" },
  { id: "vl22", question: "Jaké barvy má česká vlajka (kromě bílé a červené ještě jedna)?", answer: "modrá" },
  { id: "vl23", question: "Ve kterém měsíci slavíme vznik samostatného Československa (28. října)?", answer: "říjen" },
  { id: "vl24", question: "Jak se jmenuje budova v Praze, kde zasedá Poslanecká sněmovna?", answer: ["sněmovna", "poslanecká sněmovna"] },
  { id: "vl25", question: "Jaký je úřední jazyk v České republice?", answer: "čeština" },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomVlastivedaExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): VlastivedaExercise | undefined {
  const pool = excludeIds ? VLASTIVEDA_EXERCISES.filter((e) => !excludeIds.has(e.id)) : VLASTIVEDA_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}
