import { describe, expect, it } from "vitest";
import { SPANISH_WORDS, buildSpanishExampleSentence } from "./spanish-words";

describe("SPANISH_WORDS", () => {
  it("has at least 100 entries", () => {
    expect(SPANISH_WORDS.length).toBeGreaterThanOrEqual(100);
  });

  it("has unique ids", () => {
    const ids = SPANISH_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique Spanish words", () => {
    const words = SPANISH_WORDS.map((w) => w.es.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  it("every entry has a non-empty emoji, Czech translation, and category", () => {
    for (const word of SPANISH_WORDS) {
      expect(word.emoji.length).toBeGreaterThan(0);
      expect(word.cs.length).toBeGreaterThan(0);
      expect(word.category.length).toBeGreaterThan(0);
    }
  });
});

describe("buildSpanishExampleSentence", () => {
  it("produces a non-empty sentence containing the word for every entry", () => {
    for (const word of SPANISH_WORDS) {
      const sentence = buildSpanishExampleSentence(word);
      expect(sentence.length).toBeGreaterThan(0);
      expect(sentence).toContain(word.es);
    }
  });

  it("is deterministic for the same word", () => {
    const word = SPANISH_WORDS[0];
    expect(buildSpanishExampleSentence(word)).toBe(buildSpanishExampleSentence(word));
  });
});
