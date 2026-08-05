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

export const INVESTMENT_TERMS: InvestmentTerm[] = [
  { days: 7, rate: 0.02, label: "1 týden" },
  { days: 30, rate: 0.08, label: "1 měsíc" },
  { days: 90, rate: 0.3, label: "3 měsíce" },
];

export function findInvestmentTerm(days: number): InvestmentTerm | undefined {
  return INVESTMENT_TERMS.find((t) => t.days === days);
}

/** Principal + interest at maturity, rounded to a whole XP. */
export function maturityPayout(principal: number, rate: number): number {
  return Math.round(principal * (1 + rate));
}
