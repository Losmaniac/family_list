import { describe, expect, it } from "vitest";
import {
  FEATURED_ASSETS,
  formatCzk,
  mapQuoteType,
  nextAvgCost,
  parseChartQuote,
  parseFxRate,
  parseSearchResults,
  roundMoney,
  roundQuantity,
} from "./invest-demo";

describe("mapQuoteType", () => {
  it("maps supported Yahoo quote types to our asset types", () => {
    expect(mapQuoteType("EQUITY")).toBe("stock");
    expect(mapQuoteType("ETF")).toBe("stock");
    expect(mapQuoteType("INDEX")).toBe("index");
    expect(mapQuoteType("CRYPTOCURRENCY")).toBe("crypto");
  });

  it("returns undefined for unsupported types (futures, options, currencies...)", () => {
    expect(mapQuoteType("FUTURE")).toBeUndefined();
    expect(mapQuoteType("OPTION")).toBeUndefined();
    expect(mapQuoteType("CURRENCY")).toBeUndefined();
  });
});

describe("parseSearchResults", () => {
  it("keeps only stock/index/crypto quotes with a symbol", () => {
    const raw = {
      quotes: [
        { symbol: "AAPL", longname: "Apple Inc.", quoteType: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "^GSPC", shortname: "S&P 500", quoteType: "INDEX" },
        { symbol: "BTC-USD", longname: "Bitcoin USD", quoteType: "CRYPTOCURRENCY" },
        { symbol: "MBT=F", longname: "Micro Bitcoin Futures", quoteType: "FUTURE" },
        { longname: "No symbol", quoteType: "EQUITY" },
      ],
    };
    expect(parseSearchResults(raw)).toEqual([
      { symbol: "AAPL", name: "Apple Inc.", assetType: "stock", exchange: "NASDAQ" },
      { symbol: "^GSPC", name: "S&P 500", assetType: "index", exchange: undefined },
      { symbol: "BTC-USD", name: "Bitcoin USD", assetType: "crypto", exchange: undefined },
    ]);
  });

  it("returns an empty list for a malformed response", () => {
    expect(parseSearchResults(null)).toEqual([]);
    expect(parseSearchResults({})).toEqual([]);
  });
});

describe("parseChartQuote", () => {
  it("extracts price/currency/name from a Yahoo chart response", () => {
    const raw = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 313.33,
              currency: "USD",
              longName: "Apple Inc.",
              symbol: "AAPL",
            },
          },
        ],
      },
    };
    expect(parseChartQuote(raw)).toEqual({ symbol: "AAPL", price: 313.33, currency: "USD", name: "Apple Inc." });
  });

  it("returns null when the price/currency/symbol is missing or malformed", () => {
    expect(parseChartQuote(null)).toBeNull();
    expect(parseChartQuote({ chart: { result: [] } })).toBeNull();
    expect(parseChartQuote({ chart: { result: [{ meta: { currency: "USD" } }] } })).toBeNull();
  });
});

describe("parseFxRate", () => {
  it("returns 1 for CZK without hitting the response at all", () => {
    expect(parseFxRate(null, "CZK")).toBe(1);
  });

  it("reads the CZK rate for a foreign base currency", () => {
    expect(parseFxRate({ rates: { CZK: 21.033 } }, "USD")).toBe(21.033);
  });

  it("returns null when the rate is missing", () => {
    expect(parseFxRate({ rates: {} }, "USD")).toBeNull();
    expect(parseFxRate(null, "USD")).toBeNull();
  });
});

describe("roundQuantity / roundMoney", () => {
  it("rounds to 4 and 2 decimal places respectively", () => {
    expect(roundQuantity(1.123456)).toBe(1.1235);
    expect(roundMoney(100.005)).toBeCloseTo(100.01, 2);
  });
});

describe("nextAvgCost", () => {
  it("computes a fresh weighted average when adding to an existing position", () => {
    expect(nextAvgCost(10, 100, 10, 200)).toBe(150);
  });

  it("returns the new price outright when starting from nothing", () => {
    expect(nextAvgCost(0, 0, 5, 300)).toBe(300);
  });
});

describe("formatCzk", () => {
  it("formats with a thousands separator and Kč suffix", () => {
    expect(formatCzk(100000)).toBe(`${(100000).toLocaleString("cs-CZ")} Kč`);
  });
});

describe("FEATURED_ASSETS", () => {
  it("includes both indices and stocks, and Michelin specifically", () => {
    expect(FEATURED_ASSETS.some((a) => a.assetType === "index")).toBe(true);
    expect(FEATURED_ASSETS.some((a) => a.assetType === "stock")).toBe(true);
    expect(FEATURED_ASSETS.find((a) => a.symbol === "ML.PA")?.name).toBe("Michelin");
  });

  it("every entry has a unique symbol", () => {
    const symbols = FEATURED_ASSETS.map((a) => a.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});
