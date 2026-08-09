import { describe, expect, it } from "vitest";
import { SELF_DEVELOPMENT_EXERCISES, pickRandomSelfDevelopmentExercise } from "./self-development";

describe("SELF_DEVELOPMENT_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = SELF_DEVELOPMENT_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(SELF_DEVELOPMENT_EXERCISES.length).toBeGreaterThanOrEqual(15);
  });
});

describe("pickRandomSelfDevelopmentExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(SELF_DEVELOPMENT_EXERCISES).toContain(pickRandomSelfDevelopmentExercise(() => 0));
  });

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([SELF_DEVELOPMENT_EXERCISES[0].id]);
    const picked = pickRandomSelfDevelopmentExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(SELF_DEVELOPMENT_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(SELF_DEVELOPMENT_EXERCISES.map((e) => e.id));
    expect(pickRandomSelfDevelopmentExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
