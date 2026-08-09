/**
 * "Přírodověda" (nature science) practice content for the Vzdělání module
 * — human body, plants, animal classification, ecosystems, water cycle,
 * the solar system, weather. Standard 5th-grade "Člověk a jeho svět"
 * curriculum (RVP ZV). Hand-written for the same reason as
 * lib/czech-language.ts — this is real subject-matter knowledge, not
 * something a generator could produce correctly.
 */

export interface PrirodovedaExercise {
  id: string;
  question: string;
  answer: string;
}

export const PRIRODOVEDA_EXERCISES: PrirodovedaExercise[] = [
  // Lidské tělo
  { id: "pv1", question: "Který orgán v těle pumpuje krev?", answer: "srdce" },
  { id: "pv2", question: "Kterým orgánem dýcháme?", answer: "plíce" },
  { id: "pv3", question: "Kolik má dospělý člověk obvykle mléčných zubů — vlastně kolik má dítě mléčných zubů celkem?", answer: "20" },
  { id: "pv4", question: "Jak se nazývá největší orgán lidského těla (kryje celé tělo)?", answer: "kůže" },
  { id: "pv5", question: "Který orgán v těle zpracovává a řídí myšlení?", answer: "mozek" },
  { id: "pv6", question: "Kolik má člověk smyslů (klasicky uváděných)?", answer: "5" },
  { id: "pv7", question: "Kterým orgánem trávíme jídlo, který je dlouhý několik metrů a je v břiše?", answer: "střevo" },
  { id: "pv8", question: "Co v těle čistí krev a tvoří moč?", answer: "ledviny" },
  // Rostliny
  { id: "pv9", question: "Jak se nazývá proces, kterým rostliny pomocí světla vyrábí živiny?", answer: "fotosyntéza" },
  { id: "pv10", question: "Kterou částí rostlina nasává vodu a živiny z půdy?", answer: "kořeny" },
  { id: "pv11", question: "Jak se nazývá zelené barvivo v listech rostlin?", answer: "chlorofyl" },
  { id: "pv12", question: "Jakou částí rostliny dýchá a vypařuje vodu (má na sobě průduchy)?", answer: "list" },
  { id: "pv13", question: "Z čeho vyroste nová rostlina, když ho zasadíš do země?", answer: "semeno" },
  // Živočichové — třídy
  { id: "pv14", question: "Do jaké skupiny živočichů patří pes, kočka a kráva (kojí mláďata)?", answer: "savci" },
  { id: "pv15", question: "Do jaké skupiny živočichů patří vrabec, orel a slepice?", answer: "ptáci" },
  { id: "pv16", question: "Do jaké skupiny živočichů patří had a ještěrka?", answer: "plazi" },
  { id: "pv17", question: "Do jaké skupiny živočichů patří žába a čolek (žijí ve vodě i na souši)?", answer: "obojživelníci" },
  { id: "pv18", question: "Do jaké skupiny živočichů patří kapr a štika?", answer: "ryby" },
  { id: "pv19", question: "Do jaké skupiny živočichů patří včela, moucha a mravenec?", answer: "hmyz" },
  { id: "pv20", question: "Kolik nohou má typicky hmyz?", answer: "6" },
  { id: "pv21", question: "Kolik nohou má pavouk?", answer: "8" },
  // Ekosystémy a příroda
  { id: "pv22", question: "Jak se nazývá společenstvo rostlin a živočichů žijících spolu na jednom místě, třeba v lese?", answer: "ekosystém" },
  { id: "pv23", question: "Jak se nazývá koloběh, ve kterém voda vypařuje, tvoří mraky a padá zpět jako déšť?", answer: "koloběh vody" },
  { id: "pv24", question: "Jak se nazývá skupenství vody, když zmrzne?", answer: "led" },
  { id: "pv25", question: "Jak se nazývá přístroj, kterým měříme teplotu vzduchu?", answer: "teploměr" },
  // Vesmír
  { id: "pv26", question: "Jak se jmenuje hvězda, kolem které obíhá Země?", answer: "slunce" },
  { id: "pv27", question: "Jak se jmenuje přirozený satelit (souputník) Země na obloze?", answer: "měsíc" },
  { id: "pv28", question: "Kolikátá planeta od Slunce je Země?", answer: "3" },
  { id: "pv29", question: "Jak se nazývá naše planeta?", answer: "země" },
  { id: "pv30", question: "Jak dlouho trvá jeden oběh Země kolem Slunce (v přibližných dnech)?", answer: "365" },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomPrirodovedaExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): PrirodovedaExercise | undefined {
  const pool = excludeIds ? PRIRODOVEDA_EXERCISES.filter((e) => !excludeIds.has(e.id)) : PRIRODOVEDA_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}
