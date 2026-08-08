import { describe, expect, it } from "vitest";
import { ENGLISH_WORDS } from "./english-words";

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
