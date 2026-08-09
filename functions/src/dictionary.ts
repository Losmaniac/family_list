/**
 * "Anglický slovník" — shows an English dictionary definition (from the
 * free dictionaryapi.dev, fetched here server-side so the answer is never
 * trusted from the client, same principle as atlas.ts) and asks which word
 * it describes. Words are drawn from the existing ENGLISH_WORDS bank
 * (lib/english-words.ts) — not every one of them has a usable dictionary
 * entry, so a handful of random candidates are tried per call rather than
 * giving up on the first miss.
 */
import { buildDictionaryUrl, extractDefinition } from "../../lib/free-dictionary";
import { ENGLISH_WORDS, type EnglishWord } from "../../lib/english-words";

const MAX_CANDIDATES_PER_CALL = 8;

export interface DictionaryQuestion {
  id: string;
  question: string;
  answer: string;
  /** Never set for dictionary questions — declared so this stays structurally assignable to lib/practice.ts's PracticeProblem. */
  options?: [string, string, string];
  explanation?: string;
}

function sampleWithoutReplacement(pool: EnglishWord[], count: number, random: () => number): EnglishWord[] {
  const copy = [...pool];
  const sample: EnglishWord[] = [];
  while (copy.length > 0 && sample.length < count) {
    const index = Math.floor(random() * copy.length);
    sample.push(copy.splice(index, 1)[0]);
  }
  return sample;
}

/**
 * `excludeIds` keeps already-correctly-answered words out of the draw;
 * undefined means the whole bank is genuinely exhausted (empty pool).
 * Throws instead of returning undefined when candidates existed but none
 * of them yielded a usable dictionary entry this call — that's a
 * transient upstream hiccup, not "you've finished every word", and the
 * caller should surface it as an error rather than a false completion.
 */
export async function pickRandomDictionaryQuestion(
  excludeIds: Set<string>,
  random: () => number = Math.random
): Promise<DictionaryQuestion | undefined> {
  const pool = ENGLISH_WORDS.filter((w) => !excludeIds.has(w.id));
  if (pool.length === 0) return undefined;

  const candidates = sampleWithoutReplacement(pool, Math.min(MAX_CANDIDATES_PER_CALL, pool.length), random);
  for (const word of candidates) {
    try {
      const res = await fetch(buildDictionaryUrl(word.en));
      if (!res.ok) continue;
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) continue;
      const definition = extractDefinition(data, word.en);
      if (!definition) continue;
      return { id: word.id, question: `Jaké anglické slovo znamená: „${definition}“?`, answer: word.en };
    } catch {
      // Transient network/API hiccup for this word — try the next candidate.
    }
  }
  throw new Error("No candidate word yielded a usable dictionary definition this call.");
}
