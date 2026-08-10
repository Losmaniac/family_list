import { describe, expect, it } from "vitest";
import {
  angleClearsWall,
  gapWidthAt,
  normalizeAngle,
  shortestAngleDelta,
  simulateOptimalPlayer,
  spawnIntervalAt,
  wallSpeedAt,
  type HexGameConfig,
} from "./hex-reflex-game";

// Mirrors components/games/HexReflexGame.tsx's constants at a representative
// 380x380 canvas (playerRadius = min(w,h) * PLAYER_RADIUS_FRACTION).
const CURRENT_CONFIG: HexGameConfig = {
  playerRadius: 380 * 0.14,
  wallThickness: 18,
  rotateSpeed: 5.2,
  baseWallSpeed: 80,
  speedRampPerSec: 9,
  spawnIntervalBase: 1.3,
  spawnIntervalMin: 0.5,
  gapWidthBase: 1.6,
  gapWidthMin: 0.6,
  maxRadius: 300, // ~ hypot(380,380)/2 + 30
};

describe("shortestAngleDelta / normalizeAngle", () => {
  it("picks the shorter way around, including across the 0/2π wrap", () => {
    expect(shortestAngleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
    expect(shortestAngleDelta(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 5);
    expect(normalizeAngle(-0.1)).toBeCloseTo(Math.PI * 2 - 0.1, 5);
  });
});

describe("angleClearsWall", () => {
  it("is true inside the gap and false outside it", () => {
    const wall = { gapStart: 1, gapWidth: 0.5 };
    expect(angleClearsWall(1, wall)).toBe(true);
    expect(angleClearsWall(1.5, wall)).toBe(true);
    expect(angleClearsWall(1.6, wall)).toBe(false);
  });
});

describe("simulateOptimalPlayer against the shipped tuning", () => {
  it("an optimal player survives at least the first several walls", () => {
    // This is the actual regression check: a player who always steers the
    // shortest way to dead-center of the nearest wall's gap, at full
    // rotation speed, should comfortably clear the early game — if this
    // fails, the tuning (rotate speed vs. wall speed vs. gap width vs.
    // spawn timing) makes the very first obstacles unwinnable regardless
    // of player skill, which is a tuning bug, not "hard".
    const results = Array.from({ length: 20 }, () => simulateOptimalPlayer(CURRENT_CONFIG, 8));
    const avgWallsSurvived = results.reduce((sum, r) => sum + r.wallsSurvived, 0) / results.length;
    expect(avgWallsSurvived).toBeGreaterThanOrEqual(3);
  });
});

describe("wallSpeedAt / spawnIntervalAt / gapWidthAt", () => {
  it("all move in the expected direction as elapsed time grows", () => {
    expect(wallSpeedAt(CURRENT_CONFIG, 10)).toBeGreaterThan(wallSpeedAt(CURRENT_CONFIG, 1));
    expect(spawnIntervalAt(CURRENT_CONFIG, 10)).toBeLessThanOrEqual(spawnIntervalAt(CURRENT_CONFIG, 1));
    expect(gapWidthAt(CURRENT_CONFIG, 10)).toBeLessThanOrEqual(gapWidthAt(CURRENT_CONFIG, 1));
  });
});
