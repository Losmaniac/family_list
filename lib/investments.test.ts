import { describe, expect, it } from "vitest";
import { INVESTMENT_TERMS, effectiveInvestmentTerms, findInvestmentTerm, findTermInList, maturityPayout } from "./investments";

describe("INVESTMENT_TERMS", () => {
  it("pays a higher rate for a longer term, like a real bond yield curve", () => {
    const sorted = [...INVESTMENT_TERMS].sort((a, b) => a.days - b.days);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].rate).toBeGreaterThan(sorted[i - 1].rate);
    }
  });

  it("beats rolling over every shorter term for the same total duration", () => {
    // Otherwise the "rational" strategy is always the shortest term,
    // reinvested — which defeats the point of rewarding commitment.
    const sorted = [...INVESTMENT_TERMS].sort((a, b) => a.days - b.days);
    for (let i = 1; i < sorted.length; i++) {
      const longer = sorted[i];
      for (let j = 0; j < i; j++) {
        const shorter = sorted[j];
        const rolloverReturn = Math.pow(1 + shorter.rate, longer.days / shorter.days) - 1;
        expect(longer.rate).toBeGreaterThan(rolloverReturn);
      }
    }
  });
});

describe("findInvestmentTerm", () => {
  it("finds a term by its day count", () => {
    expect(findInvestmentTerm(30)?.label).toBe("1 měsíc");
  });

  it("returns undefined for an unknown term", () => {
    expect(findInvestmentTerm(999)).toBeUndefined();
  });
});

describe("findTermInList", () => {
  it("finds a term in a custom list by day count", () => {
    const custom = [{ days: 14, rate: 0.05, label: "2 týdny" }];
    expect(findTermInList(custom, 14)?.label).toBe("2 týdny");
  });

  it("returns undefined for an unknown term", () => {
    expect(findTermInList(INVESTMENT_TERMS, 999)).toBeUndefined();
  });
});

describe("effectiveInvestmentTerms", () => {
  it("falls back to the built-in defaults when a family hasn't set any", () => {
    expect(effectiveInvestmentTerms(undefined)).toBe(INVESTMENT_TERMS);
    expect(effectiveInvestmentTerms([])).toBe(INVESTMENT_TERMS);
  });

  it("uses the family's own terms when set", () => {
    const custom = [{ days: 14, rate: 0.05, label: "2 týdny" }];
    expect(effectiveInvestmentTerms(custom)).toBe(custom);
  });
});

describe("maturityPayout", () => {
  it("adds the rate's fraction on top of the principal", () => {
    expect(maturityPayout(100, 0.12)).toBe(112);
    expect(maturityPayout(100, 0.5)).toBe(150);
  });

  it("rounds to a whole XP", () => {
    expect(maturityPayout(55, 0.02)).toBe(56); // 55 * 1.02 = 56.1
  });
});
