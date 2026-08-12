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

  it("only ever answers with y or ý — never the unrelated i/í sound", () => {
    for (const exercise of VYJMENOVANA_SLOVA_EXERCISES) {
      expect(["y", "ý"]).toContain(exercise.answer);
    }
  });

  it("answers with the long ý where the real word requires it, not just short y", () => {
    // A representative sample across every word group (po B/L/M/P/S/V/Z) —
    // these words are genuinely spelled with a long ý (e.g. "být", "mlýn",
    // "sýr"), so accepting only short "y" would mark a correct answer wrong
    // and teach the wrong spelling.
    const expectedLong = ["vs-b1", "vs-l1", "vs-l4", "vs-l5", "vs-m1", "vs-m4", "vs-p3", "vs-p4", "vs-p5", "vs-s2", "vs-s3", "vs-v3", "vs-v5", "vs-z3", "vs-z4", "vs-z5"];
    for (const id of expectedLong) {
      const exercise = VYJMENOVANA_SLOVA_EXERCISES.find((e) => e.id === id);
      expect(exercise?.answer).toBe("ý");
    }
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

  it("never returns an excluded exercise", () => {
    const excludeIds = new Set([CZECH_EXERCISES[0].id]);
    const picked = pickRandomCzechExercise(() => 0, excludeIds);
    expect(picked?.id).not.toBe(CZECH_EXERCISES[0].id);
  });

  it("returns undefined once every exercise has been excluded", () => {
    const excludeIds = new Set(CZECH_EXERCISES.map((e) => e.id));
    expect(pickRandomCzechExercise(() => 0, excludeIds)).toBeUndefined();
  });
});
