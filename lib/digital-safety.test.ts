import { describe, expect, it } from "vitest";
import { DIGITAL_SAFETY_EXERCISES, pickRandomDigitalSafetyExercise } from "./digital-safety";

describe("DIGITAL_SAFETY_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = DIGITAL_SAFETY_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(DIGITAL_SAFETY_EXERCISES.length).toBeGreaterThanOrEqual(10);
  });

  it("every exercise has three options including the correct answer", () => {
    for (const exercise of DIGITAL_SAFETY_EXERCISES) {
      expect(exercise.options).toHaveLength(3);
      expect(exercise.options).toContain(exercise.answer);
    }
  });
});

describe("pickRandomDigitalSafetyExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(DIGITAL_SAFETY_EXERCISES).toContain(pickRandomDigitalSafetyExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([DIGITAL_SAFETY_EXERCISES[0].id]);
    const picked = pickRandomDigitalSafetyExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(DIGITAL_SAFETY_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(DIGITAL_SAFETY_EXERCISES.map((e) => e.id));
    expect(pickRandomDigitalSafetyExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
