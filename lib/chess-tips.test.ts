import { describe, expect, it } from "vitest";
import { CHESS_TIPS } from "./chess-tips";

describe("CHESS_TIPS", () => {
  it("has unique section ids", () => {
    const ids = CHESS_TIPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every section has a title and at least one non-empty tip", () => {
    for (const section of CHESS_TIPS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.tips.length).toBeGreaterThan(0);
      for (const tip of section.tips) {
        expect(tip.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
