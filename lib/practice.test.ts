import { describe, expect, it } from "vitest";
import {
  generateMathProblem,
  isAnswerCorrect,
  normalizeAnswer,
  pickGradeAppropriateMathDifficulty,
  pickRandomLogicWordProblem,
  LOGIC_WORD_PROBLEMS,
} from "./practice";

describe("generateMathProblem", () => {
  it("difficulty 1 never goes negative and adds/subtracts single digits", () => {
    // random() sequence: 0 picks '-', then max operands, forcing the largest subtraction case
    let calls = 0;
    const sequence = [0, 0.99, 0.99];
    const random = () => sequence[calls++] ?? 0.5;
    const problem = generateMathProblem(1, random);
    expect(problem.correctAnswer).toBeGreaterThanOrEqual(0);
    expect(problem.operandA).toBeGreaterThanOrEqual(1);
    expect(problem.operandA).toBeLessThanOrEqual(10);
  });

  it("computes the correct answer for +/-/× at difficulty 2", () => {
    for (let i = 0; i < 50; i++) {
      const problem = generateMathProblem(2);
      if (problem.operator === "+") expect(problem.correctAnswer).toBe(problem.operandA + problem.operandB);
      if (problem.operator === "-") expect(problem.correctAnswer).toBe(problem.operandA - problem.operandB);
      if (problem.operator === "×") expect(problem.correctAnswer).toBe(problem.operandA * problem.operandB);
      expect(problem.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it("difficulty 3 division always produces a whole-number quotient", () => {
    for (let i = 0; i < 50; i++) {
      const problem = generateMathProblem(3);
      if (problem.operator === "÷") {
        expect(problem.operandA % problem.operandB).toBe(0);
        expect(problem.correctAnswer).toBe(problem.operandA / problem.operandB);
      } else {
        expect(problem.correctAnswer).toBe(problem.operandA * problem.operandB);
      }
    }
  });
});

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

describe("pickGradeAppropriateMathDifficulty", () => {
  it("only ever returns tier 2 or 3, never the too-easy tier 1", () => {
    for (let i = 0; i <= 10; i++) {
      const difficulty = pickGradeAppropriateMathDifficulty(() => i / 10);
      expect([2, 3]).toContain(difficulty);
    }
  });
});
