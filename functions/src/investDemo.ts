/**
 * "Demo investování" — paper-trading for kids against real market prices.
 * Every price used for a trade or a valuation is fetched fresh, here,
 * server-side, from Yahoo Finance's unofficial (but free, keyless) chart
 * and search endpoints — never trusted from the client — the same "server
 * is the only source of truth for anything money-shaped" rule as XP.
 * Prices come back in the asset's native currency (mostly USD) and are
 * converted to CZK via api.frankfurter.dev (ECB rates, also free/keyless)
 * before ever touching a portfolio balance, since the parent-set starting
 * balance is in CZK.
 *
 * Yahoo's endpoints return 429 without a browser-like User-Agent — not an
 * API key, just a header, so this stays within "no registration required".
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, type DocumentReference } from "firebase-admin/firestore";
import {
  DEFAULT_INVEST_DEMO_STARTING_BALANCE,
  nextAvgCost,
  parseChartQuote,
  parseFxRate,
  parseSearchResults,
  roundMoney,
  roundQuantity,
  type InvestDemoAssetType,
} from "../../lib/invest-demo";
import { requireAuth, requireFamilyMember } from "./practice";
import type { Family, InvestDemoHolding, InvestDemoPortfolio } from "../../lib/types";

const YAHOO_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": YAHOO_USER_AGENT } });
  if (!res.ok) {
    throw new HttpsError("unavailable", `Trh je momentálně nedostupný (HTTP ${res.status}).`);
  }
  return res.json();
}

async function fetchQuote(symbol: string) {
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
  );
  const quote = parseChartQuote(data);
  if (!quote) throw new HttpsError("not-found", "Cenu se pro tento symbol nepodařilo najít.");
  return quote;
}

async function fetchFxRateToCzk(currency: string): Promise<number> {
  if (currency === "CZK") return 1;
  const data = await fetchJson(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=CZK`
  );
  const rate = parseFxRate(data, currency);
  if (rate === null) throw new HttpsError("unavailable", "Kurz měny se nepodařilo zjistit.");
  return rate;
}

/** A quote's price, converted to CZK in one call — every trade and valuation goes through this so the conversion logic only lives in one place. */
async function fetchPriceCzk(symbol: string): Promise<number> {
  const quote = await fetchQuote(symbol);
  const fxRate = await fetchFxRateToCzk(quote.currency);
  return roundMoney(quote.price * fxRate);
}

async function requireInvestDemoEnabled(familyRef: DocumentReference): Promise<Family> {
  const familySnap = await familyRef.get();
  const family = familySnap.data() as Family | undefined;
  if (family?.investDemoEnabled !== true) {
    throw new HttpsError("failed-precondition", "Demo investování není v této rodině zapnuté.");
  }
  return family;
}

interface SearchRequest {
  familyId: string;
  query: string;
}

export const searchInvestDemoAssets = onCall<SearchRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, query } = request.data;
  if (!familyId || !query || query.trim().length < 2) {
    throw new HttpsError("invalid-argument", "familyId a alespoň 2 znaky hledaného výrazu jsou povinné.");
  }
  await requireFamilyMember(familyId, uid);

  const data = await fetchJson(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}`);
  return { results: parseSearchResults(data).slice(0, 15) };
});

interface InitRequest {
  familyId: string;
}

export const initInvestDemoPortfolio = onCall<InitRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId } = request.data;
  if (!familyId) throw new HttpsError("invalid-argument", "familyId is required.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const family = await requireInvestDemoEnabled(familyRef);

  const portfolioRef = familyRef.collection("investDemoPortfolios").doc(uid);
  const snap = await portfolioRef.get();
  if (snap.exists) {
    return { cashBalance: (snap.data() as InvestDemoPortfolio).cashBalance };
  }
  const cashBalance = family.investDemoStartingBalance ?? DEFAULT_INVEST_DEMO_STARTING_BALANCE;
  await portfolioRef.set({ cashBalance, createdAt: Date.now() } satisfies InvestDemoPortfolio);
  return { cashBalance };
});

interface TradeRequest {
  familyId: string;
  symbol: string;
  name: string;
  assetType: InvestDemoAssetType;
  quantity: number;
}

export const buyInvestDemoAsset = onCall<TradeRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, symbol, name, assetType, quantity } = request.data;
  if (!familyId || !symbol || !name || !assetType || !(quantity > 0)) {
    throw new HttpsError("invalid-argument", "Neplatný požadavek na nákup.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const family = await requireInvestDemoEnabled(familyRef);

  const roundedQty = roundQuantity(quantity);
  if (roundedQty <= 0) throw new HttpsError("invalid-argument", "Množství musí být kladné.");

  const priceCzk = await fetchPriceCzk(symbol);
  const totalCzk = roundMoney(priceCzk * roundedQty);

  const portfolioRef = familyRef.collection("investDemoPortfolios").doc(uid);
  const holdingRef = portfolioRef.collection("holdings").doc(symbol);
  const startingBalance = family.investDemoStartingBalance ?? DEFAULT_INVEST_DEMO_STARTING_BALANCE;

  return db.runTransaction(async (tx) => {
    const [portfolioSnap, holdingSnap] = await Promise.all([tx.get(portfolioRef), tx.get(holdingRef)]);
    const cashBalance = portfolioSnap.exists ? (portfolioSnap.data() as InvestDemoPortfolio).cashBalance : startingBalance;
    if (totalCzk > cashBalance) {
      throw new HttpsError("failed-precondition", "Na tento nákup nemáš dost virtuálních peněz.");
    }

    const existing = holdingSnap.exists ? (holdingSnap.data() as InvestDemoHolding) : undefined;
    const newQty = roundQuantity((existing?.quantity ?? 0) + roundedQty);
    const newAvgCost = nextAvgCost(existing?.quantity ?? 0, existing?.avgCostCzk ?? 0, roundedQty, priceCzk);
    const newCashBalance = roundMoney(cashBalance - totalCzk);

    if (portfolioSnap.exists) {
      tx.update(portfolioRef, { cashBalance: newCashBalance });
    } else {
      tx.set(portfolioRef, { cashBalance: newCashBalance, createdAt: Date.now() } satisfies InvestDemoPortfolio);
    }
    tx.set(holdingRef, { symbol, name, assetType, quantity: newQty, avgCostCzk: newAvgCost } satisfies InvestDemoHolding);
    tx.set(portfolioRef.collection("transactions").doc(), {
      symbol,
      name,
      assetType,
      side: "buy",
      quantity: roundedQty,
      priceCzk,
      totalCzk,
      timestamp: Date.now(),
    });

    return { cashBalance: newCashBalance, priceCzk };
  });
});

interface SellRequest {
  familyId: string;
  symbol: string;
  quantity: number;
}

export const sellInvestDemoAsset = onCall<SellRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, symbol, quantity } = request.data;
  if (!familyId || !symbol || !(quantity > 0)) {
    throw new HttpsError("invalid-argument", "Neplatný požadavek na prodej.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  await requireInvestDemoEnabled(familyRef);

  const roundedQty = roundQuantity(quantity);
  const priceCzk = await fetchPriceCzk(symbol);

  const portfolioRef = familyRef.collection("investDemoPortfolios").doc(uid);
  const holdingRef = portfolioRef.collection("holdings").doc(symbol);

  return db.runTransaction(async (tx) => {
    const holdingSnap = await tx.get(holdingRef);
    if (!holdingSnap.exists) throw new HttpsError("failed-precondition", "Tuto pozici nevlastníš.");
    const holding = holdingSnap.data() as InvestDemoHolding;
    if (roundedQty > holding.quantity + 1e-9) {
      throw new HttpsError("failed-precondition", "Nemáš tolik kusů na prodej.");
    }

    const totalCzk = roundMoney(priceCzk * roundedQty);
    const remainingQty = roundQuantity(holding.quantity - roundedQty);

    if (remainingQty <= 0) {
      tx.delete(holdingRef);
    } else {
      tx.update(holdingRef, { quantity: remainingQty });
    }
    tx.update(portfolioRef, { cashBalance: FieldValue.increment(totalCzk) });
    tx.set(portfolioRef.collection("transactions").doc(), {
      symbol,
      name: holding.name,
      assetType: holding.assetType,
      side: "sell",
      quantity: roundedQty,
      priceCzk,
      totalCzk,
      timestamp: Date.now(),
    });

    return { totalCzk, priceCzk };
  });
});

interface QuotesRequest {
  familyId: string;
  symbols: string[];
}

/** Batched live valuation for a holdings list — one quote lookup per symbol, best-effort (a symbol Yahoo can't currently price comes back null rather than failing the whole batch). */
export const getInvestDemoQuotes = onCall<QuotesRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, symbols } = request.data;
  if (!familyId || !Array.isArray(symbols) || symbols.length === 0) {
    throw new HttpsError("invalid-argument", "familyId a symbols jsou povinné.");
  }
  await requireFamilyMember(familyId, uid);

  const limited = symbols.slice(0, 25);
  const quotes = await Promise.all(
    limited.map(async (symbol) => {
      try {
        return { symbol, priceCzk: await fetchPriceCzk(symbol) };
      } catch {
        return { symbol, priceCzk: null as number | null };
      }
    })
  );
  return { quotes };
});
