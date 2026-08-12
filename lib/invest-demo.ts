/**
 * "Demo investování" — paper-trading with real market prices (Yahoo
 * Finance's unofficial, keyless chart/search endpoints — see
 * functions/src/investDemo.ts, which is the only place that actually calls
 * out to them; this file is pure request/response shaping, kept separate
 * so it's testable without network access) and virtual CZK cash a parent
 * hands out in Settings. Trades always execute server-side at a
 * freshly-fetched price — never a client-supplied one — same trust model
 * as XP: the client only ever sees the result of a trade, never gets to
 * dictate it.
 */

export type InvestDemoAssetType = "stock" | "index" | "crypto";

/** Starting virtual cash (CZK) a demo portfolio is created with if a parent hasn't set a custom amount in Settings. */
export const DEFAULT_INVEST_DEMO_STARTING_BALANCE = 100_000;

export interface InvestDemoAsset {
  symbol: string;
  name: string;
  assetType: InvestDemoAssetType;
  exchange?: string;
}

const QUOTE_TYPE_MAP: Record<string, InvestDemoAssetType | undefined> = {
  EQUITY: "stock",
  ETF: "stock",
  INDEX: "index",
  CRYPTOCURRENCY: "crypto",
};

/** Yahoo's search results also include futures, options, mutual funds, currencies, etc. — this keeps only the three asset types a demo portfolio actually supports. */
export function mapQuoteType(quoteType: string): InvestDemoAssetType | undefined {
  return QUOTE_TYPE_MAP[quoteType];
}

interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchDisp?: string;
}

export function parseSearchResults(raw: unknown): InvestDemoAsset[] {
  const quotes = (raw as { quotes?: YahooSearchQuote[] } | undefined)?.quotes ?? [];
  const results: InvestDemoAsset[] = [];
  for (const q of quotes) {
    const assetType = q.quoteType ? mapQuoteType(q.quoteType) : undefined;
    if (!assetType || !q.symbol) continue;
    results.push({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      assetType,
      exchange: q.exchDisp,
    });
  }
  return results;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
  symbol?: string;
}

export interface InvestDemoQuote {
  symbol: string;
  price: number;
  currency: string;
  name?: string;
}

export function parseChartQuote(raw: unknown): InvestDemoQuote | null {
  const meta = (raw as { chart?: { result?: { meta?: YahooChartMeta }[] } } | undefined)?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number" || !meta.symbol || !meta.currency) return null;
  return { symbol: meta.symbol, price: meta.regularMarketPrice, currency: meta.currency, name: meta.longName || meta.shortName };
}

interface FrankfurterResponse {
  rates?: Record<string, number>;
}

/** How many CZK one unit of `currency` is worth right now, via api.frankfurter.dev (free, keyless, ECB rates). */
export function parseFxRate(raw: unknown, currency: string): number | null {
  if (currency === "CZK") return 1;
  const rate = (raw as FrankfurterResponse | undefined)?.rates?.CZK;
  return typeof rate === "number" ? rate : null;
}

/** Fractional shares are allowed (matches real brokers) but rounded to 4 decimal places to avoid float-dust quantities that never quite reach zero. */
export function roundQuantity(qty: number): number {
  return Math.round(qty * 10_000) / 10_000;
}

/** CZK amounts round to 2 decimal places (haléře). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Weighted-average cost basis after adding `addQty` more units at `addPrice`. */
export function nextAvgCost(currentQty: number, currentAvgCost: number, addQty: number, addPrice: number): number {
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return 0;
  return (currentQty * currentAvgCost + addQty * addPrice) / totalQty;
}

export function formatCzk(amount: number): string {
  return `${amount.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč`;
}

/**
 * Monthly demo-investing contest (see functions/src/investDemo.ts's
 * investDemoContestSettle/investDemoContestReset) — 1st/2nd/3rd place by
 * % return since the round's baseline value, index 0 = 1st place. Anyone
 * placing outside the top 3 gets 0.
 */
export const CONTEST_XP_AWARDS = [100, 50, 25];

export interface ContestParticipant {
  userId: string;
  /** Current total value (cash + holdings at live prices), in CZK. */
  totalValueCzk: number;
  /** Total value at the start of this round, in CZK — the % return is measured against this. */
  baselineCzk: number;
}

export interface ContestStanding {
  userId: string;
  totalValueCzk: number;
  /** Fractional return since baseline — 0.08 = +8%. */
  returnPct: number;
  /** CONTEST_XP_AWARDS[rank] for the top 3, 0 otherwise. */
  xpAwarded: number;
}

/**
 * Ranks participants by return since their own baseline (highest first) and
 * assigns CONTEST_XP_AWARDS to the top 3. A zero/negative baseline (should
 * never happen — a portfolio always starts with a positive cash balance —
 * but paper-trading math shouldn't ever divide by zero) is treated as 0%
 * return rather than crashing. Ties keep their relative input order (stable
 * sort), same as every other leaderboard in this app.
 */
export function rankContestParticipants(participants: ContestParticipant[]): ContestStanding[] {
  const withReturn = participants.map((p) => ({
    userId: p.userId,
    totalValueCzk: p.totalValueCzk,
    returnPct: p.baselineCzk > 0 ? (p.totalValueCzk - p.baselineCzk) / p.baselineCzk : 0,
  }));
  return [...withReturn]
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((standing, index) => ({ ...standing, xpAwarded: CONTEST_XP_AWARDS[index] ?? 0 }));
}

/** The asset's own quoted price, in its native currency (USD/EUR/…) — shown alongside the CZK conversion so the number matches what a real broker/ticker would show. */
export function formatNativePrice(price: number, currency: string): string {
  return `${price.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${currency}`;
}

export const ASSET_TYPE_LABELS: Record<InvestDemoAssetType, string> = {
  stock: "Akcie",
  index: "Index",
  crypto: "Kryptoměna",
};

/** A plain-language explanation of what owning each asset type actually means — shown to a kid before they buy, not just the type's one-word label. */
export const ASSET_TYPE_EXPLANATIONS: Record<InvestDemoAssetType, string> = {
  stock:
    "Akcie je malý podíl vlastnictví jedné konkrétní firmy. Když ji koupíš, staneš se (v malém) spoluvlastníkem té společnosti — pokud se firmě daří, cena akcie obvykle roste, pokud ne, může klesat.",
  index:
    "Index není jedna firma, ale sleduje průměrnou výkonnost velké skupiny firem najednou (např. 500 největších amerických společností). Koupí indexu tak nevsázíš na jednu firmu, ale na to, jak se daří celému trhu.",
  crypto:
    "Kryptoměna je digitální měna, která nepatří žádné bance ani státu — funguje na technologii zvané blockchain. Cena bývá mnohem více kolísavá (nahoru i dolů) než u akcií nebo indexů.",
};

/**
 * A hand-picked starter list shown up front, before any search — mainstream
 * indices and well-known stocks a kid is likely to have heard of, so there's
 * always something to look at/trade even without knowing what to search
 * for. Michelin (ML.PA, its primary Euronext Paris listing) is included
 * explicitly per a parent's request — a real-world example of a
 * non-tech, non-US household name.
 */
export const FEATURED_ASSETS: InvestDemoAsset[] = [
  { symbol: "^GSPC", name: "S&P 500", assetType: "index" },
  { symbol: "^DJI", name: "Dow Jones Industrial Average", assetType: "index" },
  { symbol: "^IXIC", name: "Nasdaq Composite", assetType: "index" },
  { symbol: "AAPL", name: "Apple Inc.", assetType: "stock" },
  { symbol: "MSFT", name: "Microsoft Corporation", assetType: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corporation", assetType: "stock" },
  { symbol: "AMZN", name: "Amazon.com Inc.", assetType: "stock" },
  { symbol: "ML.PA", name: "Michelin", assetType: "stock", exchange: "Paris" },
  { symbol: "BTC-USD", name: "Bitcoin", assetType: "crypto" },
  { symbol: "ETH-USD", name: "Ethereum", assetType: "crypto" },
];
