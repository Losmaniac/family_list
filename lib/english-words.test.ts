import { describe, expect, it } from "vitest";
import { ENGLISH_WORDS, buildExampleSentence } from "./english-words";

describe("ENGLISH_WORDS", () => {
  it("has at least 500 entries", () => {
    expect(ENGLISH_WORDS.length).toBeGreaterThanOrEqual(500);
  });

  it("has unique ids", () => {
    const ids = ENGLISH_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique English words", () => {
    const words = ENGLISH_WORDS.map((w) => w.en.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  it("every entry has a non-empty emoji, Czech translation, and category", () => {
    for (const word of ENGLISH_WORDS) {
      expect(word.emoji.length).toBeGreaterThan(0);
      expect(word.cs.length).toBeGreaterThan(0);
      expect(word.category.length).toBeGreaterThan(0);
    }
  });
});

describe("buildExampleSentence", () => {
  it("produces a non-empty, English-only sentence containing the word for every entry", () => {
    for (const word of ENGLISH_WORDS) {
      const sentence = buildExampleSentence(word);
      expect(sentence.length).toBeGreaterThan(0);
      expect(sentence.toLowerCase()).toContain(word.en.toLowerCase());
      expect(sentence.endsWith(".")).toBe(true);
    }
  });

  it("picks a/an correctly based on the word's first sound", () => {
    expect(buildExampleSentence({ en: "ant", category: "Zvířata" })).toContain("an ant");
    expect(buildExampleSentence({ en: "cat", category: "Zvířata" })).toContain("a cat");
  });
});
