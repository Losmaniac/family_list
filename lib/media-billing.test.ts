import { describe, expect, it } from "vitest";
import { billableBlocksElapsed, MEDIA_XP_COST_PER_BLOCK } from "./media-billing";

describe("MEDIA_XP_COST_PER_BLOCK", () => {
  it("charges TV 5x radio's rate", () => {
    expect(MEDIA_XP_COST_PER_BLOCK.tv).toBe(MEDIA_XP_COST_PER_BLOCK.radio * 5);
  });
});

describe("billableBlocksElapsed", () => {
  it("is free for the first two minutes", () => {
    expect(billableBlocksElapsed(0)).toBe(0);
    expect(billableBlocksElapsed(60_000)).toBe(0);
    expect(billableBlocksElapsed(2 * 60_000 - 1)).toBe(0);
  });

  it("charges the first block the instant the grace period ends", () => {
    expect(billableBlocksElapsed(2 * 60_000)).toBe(1);
  });

  it("stays at 1 for the rest of the first five-minute block", () => {
    expect(billableBlocksElapsed(3 * 60_000)).toBe(1);
    expect(billableBlocksElapsed(7 * 60_000 - 1)).toBe(1);
  });

  it("charges the next block the instant a new one starts", () => {
    expect(billableBlocksElapsed(7 * 60_000)).toBe(2);
    expect(billableBlocksElapsed(12 * 60_000)).toBe(3);
    expect(billableBlocksElapsed(17 * 60_000)).toBe(4);
  });

  it("honors a custom grace period", () => {
    expect(billableBlocksElapsed(5 * 60_000 - 1, 5)).toBe(0);
    expect(billableBlocksElapsed(5 * 60_000, 5)).toBe(1);
    expect(billableBlocksElapsed(0, 0)).toBe(1);
  });
});
