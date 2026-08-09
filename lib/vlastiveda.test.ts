import { describe, expect, it } from "vitest";
import { isAnswerCorrect } from "./practice";
import { VLASTIVEDA_EXERCISES, pickRandomVlastivedaExercise } from "./vlastiveda";

describe("VLASTIVEDA_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = VLASTIVEDA_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(VLASTIVEDA_EXERCISES.length).toBeGreaterThanOrEqual(20);
  });

  it("every multi-phrasing answer has at least two distinct, non-empty entries", () => {
    for (const exercise of VLASTIVEDA_EXERCISES) {
      if (Array.isArray(exercise.answer)) {
        expect(exercise.answer.length).toBeGreaterThanOrEqual(2);
        expect(exercise.answer.every((a) => a.trim().length > 0)).toBe(true);
      }
    }
  });

  it("accepts 'česká koruna' as well as 'koruna' for the currency question", () => {
    const currency = VLASTIVEDA_EXERCISES.find((e) => e.id === "vl6")!;
    expect(isAnswerCorrect("česká koruna", currency.answer)).toBe(true);
    expect(isAnswerCorrect("koruna", currency.answer)).toBe(true);
  });

  it("accepts any of the four countries bordering Czechia, not just Germany", () => {
    const neighbor = VLASTIVEDA_EXERCISES.find((e) => e.id === "vl8")!;
    for (const country of ["německo", "polsko", "rakousko", "slovensko"]) {
      expect(isAnswerCorrect(country, neighbor.answer)).toBe(true);
    }
  });
});

describe("pickRandomVlastivedaExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(VLASTIVEDA_EXERCISES).toContain(pickRandomVlastivedaExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([VLASTIVEDA_EXERCISES[0].id]);
    const picked = pickRandomVlastivedaExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(VLASTIVEDA_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(VLASTIVEDA_EXERCISES.map((e) => e.id));
    expect(pickRandomVlastivedaExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
