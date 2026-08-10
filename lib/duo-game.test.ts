import { describe, expect, it } from "vitest";
import { ballFitsInGap, pickReachableGap, someAngleFitsGap } from "./duo-game";

const CANVAS_WIDTH = 340;
const PIVOT_X = CANVAS_WIDTH / 2;
const ORBIT_RADIUS = 90;
const BALL_RADIUS = 8;

describe("pickReachableGap", () => {
  it("keeps the gap inside the reachable band when it fits", () => {
    for (let i = 0; i < 200; i++) {
      const gap = pickReachableGap(CANVAS_WIDTH, PIVOT_X, ORBIT_RADIUS, 60);
      expect(gap.gapStart).toBeGreaterThanOrEqual(PIVOT_X - ORBIT_RADIUS - 1e-9);
      expect(gap.gapStart + gap.gapWidth).toBeLessThanOrEqual(PIVOT_X + ORBIT_RADIUS + 1e-9);
    }
  });

  it("clamps to the reachable band's left edge when the gap is wider than the band", () => {
    const gap = pickReachableGap(CANVAS_WIDTH, PIVOT_X, ORBIT_RADIUS, ORBIT_RADIUS * 3);
    expect(gap.gapStart).toBe(PIVOT_X - ORBIT_RADIUS);
  });

  it("never places a gap the balls could never reach at all", () => {
    // The bug this guards against: a gap generated across the *whole*
    // canvas width, landing entirely outside [pivotX-R, pivotX+R] and
    // making the obstacle impossible to pass no matter the angle.
    for (let i = 0; i < 200; i++) {
      const gap = pickReachableGap(CANVAS_WIDTH, PIVOT_X, ORBIT_RADIUS, 60);
      expect(someAngleFitsGap(PIVOT_X, ORBIT_RADIUS, BALL_RADIUS, gap)).toBe(true);
    }
  });
});

describe("someAngleFitsGap / ballFitsInGap", () => {
  it("finds a fitting angle for a gap centered on the pivot", () => {
    const gap = { gapStart: PIVOT_X - 20, gapWidth: 40 };
    expect(someAngleFitsGap(PIVOT_X, ORBIT_RADIUS, BALL_RADIUS, gap)).toBe(true);
  });

  it("reports no fitting angle for a gap entirely outside the reachable band", () => {
    const gap = { gapStart: PIVOT_X + ORBIT_RADIUS + 50, gapWidth: 40 };
    expect(someAngleFitsGap(PIVOT_X, ORBIT_RADIUS, BALL_RADIUS, gap)).toBe(false);
  });

  it("ballFitsInGap is exact at the gap's edges", () => {
    const gap = { gapStart: 100, gapWidth: 20 };
    expect(ballFitsInGap(108, 8, gap)).toBe(true); // [100,116] just inside [100,120]
    expect(ballFitsInGap(107, 8, gap)).toBe(false); // [99,115] pokes out the left edge
  });
});
