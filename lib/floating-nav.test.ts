import { describe, expect, it } from "vitest";
import { arcOffset, layoutRings, MIN_SPACING, ringCapacity } from "./floating-nav";

describe("arcOffset", () => {
  it("places a single item at the arc's midpoint (45deg)", () => {
    const { right, bottom } = arcOffset(0, 1, 100);
    expect(right).toBeCloseTo(bottom, 5);
  });

  it("places the first of several items straight out (0deg — right, no rise)", () => {
    const { right, bottom } = arcOffset(0, 4, 100);
    expect(right).toBeCloseTo(100, 5);
    expect(bottom).toBeCloseTo(0, 5);
  });

  it("places the last of several items straight up (90deg — no reach, full rise)", () => {
    const { right, bottom } = arcOffset(3, 4, 100);
    expect(right).toBeCloseTo(0, 5);
    expect(bottom).toBeCloseTo(100, 5);
  });
});

describe("ringCapacity", () => {
  it("grows with radius — a roomier arc holds more items before crowding", () => {
    expect(ringCapacity(200)).toBeGreaterThan(ringCapacity(100));
  });

  it("never drops below 2", () => {
    expect(ringCapacity(1)).toBeGreaterThanOrEqual(2);
  });
});

describe("layoutRings", () => {
  it("never overlaps adjacent items on the same ring — every gap is at least MIN_SPACING apart", () => {
    // 14 items is roughly this app's actual nav item count for a parent —
    // the exact scenario that used to crowd everything onto one ring.
    const items = Array.from({ length: 14 }, (_, i) => `item-${i}`);
    const positioned = layoutRings(items);
    expect(positioned).toHaveLength(14);

    // Group by radius (rounded) to find which items share a ring, then check
    // consecutive angular spacing within each ring.
    const byRadius = new Map<number, { right: number; bottom: number }[]>();
    for (const { right, bottom } of positioned) {
      const radius = Math.round(Math.hypot(right, bottom));
      (byRadius.get(radius) ?? byRadius.set(radius, []).get(radius)!).push({ right, bottom });
    }
    for (const points of byRadius.values()) {
      for (let i = 1; i < points.length; i++) {
        const dist = Math.hypot(points[i].right - points[i - 1].right, points[i].bottom - points[i - 1].bottom);
        expect(dist).toBeGreaterThanOrEqual(MIN_SPACING - 1);
      }
    }
  });

  it("spreads items across more than one ring once a single ring would crowd", () => {
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);
    const positioned = layoutRings(items);
    const radii = new Set(positioned.map(({ right, bottom }) => Math.round(Math.hypot(right, bottom))));
    expect(radii.size).toBeGreaterThan(1);
  });

  it("handles an empty item list", () => {
    expect(layoutRings([])).toEqual([]);
  });
});
