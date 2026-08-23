import { describe, expect, it } from "vitest";
import { formatMoneyCzk, sumBudgetExpensesByCategory, sumMoneyEntries } from "./money";

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

describe("sumBudgetExpensesByCategory", () => {
  it("sums expenses per category, highest first, ignoring income", () => {
    expect(
      sumBudgetExpensesByCategory([
        { type: "expense", amount: 200, category: "Jídlo" },
        { type: "expense", amount: 800, category: "Bydlení" },
        { type: "expense", amount: 100, category: "Jídlo" },
        { type: "income", amount: 5000, category: "Jídlo" },
      ])
    ).toEqual([
      { category: "Bydlení", amount: 800 },
      { category: "Jídlo", amount: 300 },
    ]);
  });

  it("groups entries with no category under 'Bez kategorie'", () => {
    expect(sumBudgetExpensesByCategory([{ type: "expense", amount: 50 }])).toEqual([{ category: "Bez kategorie", amount: 50 }]);
  });

  it("returns an empty array for no expenses", () => {
    expect(sumBudgetExpensesByCategory([{ type: "income", amount: 100, category: "Jídlo" }])).toEqual([]);
  });
});
