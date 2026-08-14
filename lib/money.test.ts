import { describe, expect, it } from "vitest";
import { formatMoneyCzk, sumMoneyEntries } from "./money";

describe("sumMoneyEntries", () => {
  it("adds income and subtracts expense", () => {
    expect(
      sumMoneyEntries([
        { type: "income", amount: 500 },
        { type: "expense", amount: 120 },
        { type: "income", amount: 50 },
      ])
    ).toBe(430);
  });

  it("returns 0 for no entries", () => {
    expect(sumMoneyEntries([])).toBe(0);
  });

  it("can go negative if expenses exceed income", () => {
    expect(sumMoneyEntries([{ type: "expense", amount: 100 }])).toBe(-100);
  });
});

describe("formatMoneyCzk", () => {
  it("formats with a thousands separator and Kč suffix", () => {
    expect(formatMoneyCzk(1500)).toBe(`${(1500).toLocaleString("cs-CZ")} Kč`);
  });
});
