import { describe, expect, it } from "vitest";
import { FINANCIAL_LITERACY_EXERCISES, pickRandomFinancialLiteracyExercise } from "./financial-literacy";

describe("FINANCIAL_LITERACY_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = FINANCIAL_LITERACY_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(FINANCIAL_LITERACY_EXERCISES.length).toBeGreaterThanOrEqual(15);
  });
});

describe("pickRandomFinancialLiteracyExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(FINANCIAL_LITERACY_EXERCISES).toContain(pickRandomFinancialLiteracyExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([FINANCIAL_LITERACY_EXERCISES[0].id]);
    const picked = pickRandomFinancialLiteracyExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(FINANCIAL_LITERACY_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(FINANCIAL_LITERACY_EXERCISES.map((e) => e.id));
    expect(pickRandomFinancialLiteracyExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
