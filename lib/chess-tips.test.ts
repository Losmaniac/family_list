import { describe, expect, it } from "vitest";
import { CHESS_TIPS_ADVANCED, CHESS_TIPS_BASICS, type ChessTipSection } from "./chess-tips";

function checkSections(sections: ChessTipSection[]) {
  const ids = sections.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const section of sections) {
    expect(section.title.length).toBeGreaterThan(0);
    expect(section.tips.length).toBeGreaterThan(0);
    for (const tip of section.tips) {
      expect(tip.trim().length).toBeGreaterThan(0);
    }
  }
}

describe("CHESS_TIPS_BASICS", () => {
  it("has unique section ids and non-empty content", () => {
    checkSections(CHESS_TIPS_BASICS);
  });
});

describe("CHESS_TIPS_ADVANCED", () => {
  it("has unique section ids and non-empty content", () => {
    checkSections(CHESS_TIPS_ADVANCED);
  });

  it("doesn't reuse a section id from the basics tier", () => {
    const basicIds = new Set(CHESS_TIPS_BASICS.map((s) => s.id));
    for (const section of CHESS_TIPS_ADVANCED) {
      expect(basicIds.has(section.id)).toBe(false);
    }
  });
});
