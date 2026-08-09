import { describe, expect, it } from "vitest";
import { AI_LITERACY_EXERCISES, pickRandomAiLiteracyExercise } from "./ai-literacy";

describe("AI_LITERACY_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = AI_LITERACY_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(AI_LITERACY_EXERCISES.length).toBeGreaterThanOrEqual(15);
  });

  it("every multiple-choice exercise's options include the correct answer", () => {
    for (const exercise of AI_LITERACY_EXERCISES.filter((e) => e.options)) {
      expect(exercise.options).toContain(exercise.answer);
    }
  });
});

describe("pickRandomAiLiteracyExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(AI_LITERACY_EXERCISES).toContain(pickRandomAiLiteracyExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([AI_LITERACY_EXERCISES[0].id]);
    const picked = pickRandomAiLiteracyExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(AI_LITERACY_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(AI_LITERACY_EXERCISES.map((e) => e.id));
    expect(pickRandomAiLiteracyExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
