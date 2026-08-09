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
});
