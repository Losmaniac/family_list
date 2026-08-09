import { describe, expect, it } from "vitest";
import { VLASTIVEDA_EXERCISES, pickRandomVlastivedaExercise } from "./vlastiveda";

describe("VLASTIVEDA_EXERCISES", () => {
  it("has unique ids", () => {
    const ids = VLASTIVEDA_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a sizeable bank", () => {
    expect(VLASTIVEDA_EXERCISES.length).toBeGreaterThanOrEqual(20);
  });
});

describe("pickRandomVlastivedaExercise", () => {
  it("always returns an exercise from the bank", () => {
    expect(VLASTIVEDA_EXERCISES).toContain(pickRandomVlastivedaExercise(() => 0));
  });
});
