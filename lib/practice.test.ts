import { describe, expect, it } from "vitest";
import { isAnswerCorrect, normalizeAnswer, pickRandomLogicWordProblem, LOGIC_WORD_PROBLEMS } from "./practice";

describe("normalizeAnswer / isAnswerCorrect", () => {
  it("ignores case, surrounding whitespace, and repeated internal spaces", () => {
    expect(normalizeAnswer("  Cyril  ")).toBe("cyril");
    expect(isAnswerCorrect(" CYRIL ", "cyril")).toBe(true);
    expect(isAnswerCorrect("cy ril", "cyril")).toBe(false);
  });

  it("rejects a wrong answer", () => {
    expect(isAnswerCorrect("7", "8")).toBe(false);
  });
});

describe("pickRandomLogicWordProblem", () => {
  it("respects the requested difficulty when problems exist for it", () => {
    const problem = pickRandomLogicWordProblem(1, () => 0);
    expect(problem.difficulty).toBe(1);
  });

  it("falls back to the full bank when no difficulty is given", () => {
    const problem = pickRandomLogicWordProblem(undefined, () => 0);
    expect(LOGIC_WORD_PROBLEMS).toContain(problem);
  });
});

describe("LOGIC_WORD_PROBLEMS", () => {
  it("has a sizeable, unique repertoire", () => {
    expect(LOGIC_WORD_PROBLEMS.length).toBeGreaterThanOrEqual(30);
    const ids = LOGIC_WORD_PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never contains a bare arithmetic expression as the question", () => {
    // Straight "12 + 7 = ?" arithmetic was removed on purpose — everything
    // left needs to be read and understood, not just punched into a
    // calculator.
    for (const problem of LOGIC_WORD_PROBLEMS) {
      expect(problem.question).not.toMatch(/^\s*\d+\s*[+\-×÷]\s*\d+\s*=\s*\?\s*$/);
    }
  });
});
