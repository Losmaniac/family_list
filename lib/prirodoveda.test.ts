import { describe, expect, it } from "vitest";
import { PRIRODOVEDA_EXERCISES, pickRandomPrirodovedaExercise } from "./prirodoveda";

describe("PRIRODOVEDA_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = PRIRODOVEDA_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(PRIRODOVEDA_EXERCISES.length).toBeGreaterThanOrEqual(25);
  });
});

describe("pickRandomPrirodovedaExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(PRIRODOVEDA_EXERCISES).toContain(pickRandomPrirodovedaExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([PRIRODOVEDA_EXERCISES[0].id]);
    const picked = pickRandomPrirodovedaExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(PRIRODOVEDA_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(PRIRODOVEDA_EXERCISES.map((e) => e.id));
    expect(pickRandomPrirodovedaExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
