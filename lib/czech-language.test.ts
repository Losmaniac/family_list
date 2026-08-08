import { describe, expect, it } from "vitest";
import { CURRICULUM_EXERCISES, CZECH_EXERCISES, VYJMENOVANA_SLOVA_EXERCISES, pickRandomCzechExercise } from "./czech-language";

describe("VYJMENOVANA_SLOVA_EXERCISES", () => {
  it("has at least 5 exercises for each of the 7 word groups", () => {
    const groups = ["vs-b", "vs-l", "vs-m", "vs-p", "vs-s", "vs-v", "vs-z"];
    for (const prefix of groups) {
      const count = VYJMENOVANA_SLOVA_EXERCISES.filter((e) => e.id.startsWith(prefix)).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  it("has unique ids", () => {
    const ids = VYJMENOVANA_SLOVA_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("CURRICULUM_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = CURRICULUM_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is non-empty", () => {
    expect(CURRICULUM_EXERCISES.length).toBeGreaterThan(0);
  });
});

describe("pickRandomCzechExercise", () => {
  it("always returns an exercise from the combined bank", () => {
    const picked = pickRandomCzechExercise(() => 0);
    expect(CZECH_EXERCISES).toContain(picked);
  });

  it("can return the last exercise when random rolls close to 1", () => {
    const picked = pickRandomCzechExercise(() => 0.999999);
    expect(picked).toBe(CZECH_EXERCISES[CZECH_EXERCISES.length - 1]);
  });
});
