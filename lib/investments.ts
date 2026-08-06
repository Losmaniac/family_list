/**
 * Fixed-term "bonds" — a member locks XP away for a set period at a fixed
 * rate, mirroring how longer-duration bonds pay more to compensate for
 * giving up liquidity. Centralized here (not in a component) for the same
 * reason as xp-engine.ts: one source of truth, shared by the client (to
 * show term options) and the Cloud Functions that actually move XP.
 */
export interface InvestmentTerm {
  days: number;
  /** Fractional return over the full term — 0.08 = principal grows by 8%. */
  rate: number;
  label: string;
}

// Each longer tier must beat repeatedly rolling over the shorter one for
// the same total duration — otherwise the "rational" move is to always
// pick the shortest term and reinvest, which defeats the entire point of
// rewarding a longer commitment. E.g. 4.29x weekly compounding over 30
// days at 2%/week already reaches ~8.9%, so the monthly rate has to clear
// that bar with real room to spare, not just nominally look bigger.
export const INVESTMENT_TERMS: InvestmentTerm[] = [
  { days: 7, rate: 0.02, label: "1 týden" },
  { days: 30, rate: 0.12, label: "1 měsíc" },
  { days: 90, rate: 0.5, label: "3 měsíce" },
];

export function findInvestmentTerm(days: number): InvestmentTerm | undefined {
  return INVESTMENT_TERMS.find((t) => t.days === days);
}

/** Same lookup, but against a family's own configured terms (falls back to the built-in defaults when a family hasn't set any) — used wherever a parent may have overridden the term list in Settings. */
export function findTermInList(terms: InvestmentTerm[], days: number): InvestmentTerm | undefined {
  return terms.find((t) => t.days === days);
}

export function effectiveInvestmentTerms(customTerms: InvestmentTerm[] | undefined): InvestmentTerm[] {
  return customTerms && customTerms.length > 0 ? customTerms : INVESTMENT_TERMS;
}

/** Principal + interest at maturity, rounded to a whole XP. */
export function maturityPayout(principal: number, rate: number): number {
  return Math.round(principal * (1 + rate));
}
