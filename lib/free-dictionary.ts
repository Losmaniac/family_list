/**
 * Pure helpers for the "Anglický slovník" practice subject — the free,
 * keyless Free Dictionary API (dictionaryapi.dev) gives an English
 * definition for a word; the member is shown the definition and has to
 * type which word it describes. URL building and response-shaping only
 * (pure, testable); the actual fetch() happens server-side in
 * functions/src/dictionary.ts, same split as every other external data
 * source in this app but on the Cloud Function side since it needs to run
 * per-generated-question, same as atlas.ts.
 */

export function buildDictionaryUrl(word: string): string {
  return `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
}

interface RawDefinition {
  definition?: string;
}

interface RawMeaning {
  definitions?: RawDefinition[];
}

interface RawEntry {
  meanings?: RawMeaning[];
}

/**
 * The first definition that doesn't give the answer away by containing
 * the word itself, and is long enough to actually be useful — undefined
 * if the response has nothing usable (e.g. every definition is a
 * cross-reference like "See also foo").
 */
export function extractDefinition(entries: RawEntry[], word: string): string | undefined {
  const lowerWord = word.toLowerCase();
  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        const text = def.definition;
        if (!text || text.length < 8) continue;
        if (text.toLowerCase().includes(lowerWord)) continue;
        return text;
      }
    }
  }
  return undefined;
}
