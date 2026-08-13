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
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import {
  DEFAULT_INVEST_DEMO_STARTING_BALANCE,
  formatCzk,
  nextAvgCost,
  parseChartQuote,
  parseFxRate,
  parseSearchResults,
  rankContestParticipants,
  roundMoney,
  roundQuantity,
  type ContestParticipant,
  type InvestDemoAssetType,
} from "../../lib/invest-demo";
import { dayOfMonthInFamilyZone, lastDayOfMonthInFamilyZone, monthKeyInFamilyZone } from "../../lib/date-utils";
import { buildLedgerEntry, formatXp } from "../../lib/xp-engine";
import { notifyMembers, type NotifyTarget } from "./notifyHelpers";
import { requireAuth, requireFamilyMember } from "./practice";
import type { Family, InvestDemoContestResult, InvestDemoHolding, InvestDemoPortfolio, Member } from "../../lib/types";

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

/** Like fetchPriceCzk, but also returns the native price/currency — used where the UI shows both (e.g. "3 200 Kč · 150.25 USD"). */
async function fetchQuoteWithCzk(symbol: string): Promise<{ priceCzk: number; price: number; currency: string }> {
  const quote = await fetchQuote(symbol);
  const fxRate = await fetchFxRateToCzk(quote.currency);
  return { priceCzk: roundMoney(quote.price * fxRate), price: quote.price, currency: quote.currency };
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
  const now = Date.now();
  // roundStartCzk starts equal to cashBalance — fair, since there's nothing
  // to have grown yet, and lets someone who joins mid-month still compete
  // on an even footing from their own join date.
  await portfolioRef.set({
    cashBalance,
    createdAt: now,
    roundStartCzk: cashBalance,
    roundStartAt: now,
    totalValueCzk: cashBalance,
    valuedAt: now,
  } satisfies InvestDemoPortfolio);
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
        const { priceCzk, price, currency } = await fetchQuoteWithCzk(symbol);
        return { symbol, priceCzk, price, currency };
      } catch {
        return { symbol, priceCzk: null as number | null, price: null as number | null, currency: null as string | null };
      }
    })
  );
  return { quotes };
});

/** Cash + holdings at live prices, in CZK — best-effort per symbol (a symbol Yahoo can't currently price today just doesn't contribute, same as getInvestDemoQuotes above, rather than failing the whole contest for one bad quote). */
async function computeTotalValueCzk(portfolio: InvestDemoPortfolio, holdings: InvestDemoHolding[]): Promise<number> {
  const holdingValues = await Promise.all(
    holdings.map(async (h) => {
      try {
        return (await fetchPriceCzk(h.symbol)) * h.quantity;
      } catch {
        return 0;
      }
    })
  );
  return roundMoney(portfolio.cashBalance + holdingValues.reduce((sum, v) => sum + v, 0));
}

async function allInvestDemoEnabledFamilies(db: Firestore) {
  return db.collection("families").where("investDemoEnabled", "==", true).get();
}

/**
 * Liquidates every holding in a portfolio to cash — used right before the
 * monthly contest is ranked, so standings compare a single realized CZK
 * balance instead of a live-priced "what if I sold now" estimate that could
 * shift between ranking and payout. A symbol Yahoo can't currently price is
 * left untouched (stays in the portfolio for next month) rather than
 * blocking the whole settlement, same best-effort convention as
 * computeTotalValueCzk. Returns the portfolio's final cash balance in CZK.
 */
async function liquidatePortfolio(db: Firestore, familyRef: DocumentReference, uid: string): Promise<number> {
  const portfolioRef = familyRef.collection("investDemoPortfolios").doc(uid);
  const holdingsSnap = await portfolioRef.collection("holdings").get();
  const priced = await Promise.all(
    holdingsSnap.docs.map(async (d) => {
      const holding = d.data() as InvestDemoHolding;
      try {
        const priceCzk = await fetchPriceCzk(holding.symbol);
        return { ref: d.ref, holding, priceCzk };
      } catch {
        return null;
      }
    })
  );

  return db.runTransaction(async (tx) => {
    const portfolioSnap = await tx.get(portfolioRef);
    const portfolio = portfolioSnap.data() as InvestDemoPortfolio;
    let cashBalance = portfolio.cashBalance;

    for (const p of priced) {
      if (!p) continue;
      const totalCzk = roundMoney(p.priceCzk * p.holding.quantity);
      cashBalance = roundMoney(cashBalance + totalCzk);
      tx.delete(p.ref);
      tx.set(portfolioRef.collection("transactions").doc(), {
        symbol: p.holding.symbol,
        name: p.holding.name,
        assetType: p.holding.assetType,
        side: "sell",
        quantity: p.holding.quantity,
        priceCzk: p.priceCzk,
        totalCzk,
        timestamp: Date.now(),
      });
    }

    tx.update(portfolioRef, { cashBalance, totalValueCzk: cashBalance, valuedAt: Date.now() });
    return cashBalance;
  });
}

/**
 * Settles the monthly "kdo má nejvíc" contest — last day of every month,
 * 20:00 Europe/Prague (a daily 20:00 schedule that no-ops on every day
 * except the last, since standard cron can't express "last day of month"
 * directly). Liquidates every portfolio to cash first (see
 * liquidatePortfolio), then ranks the family by that final absolute CZK
 * balance, awards CONTEST_XP_AWARDS to the top 3 through the standard
 * ledger transaction — except a top-3 finisher whose balance didn't end up
 * above where it started the round gets nothing (see
 * rankContestParticipants) — and records the full standings for
 * history/display.
 */
export const investDemoContestSettle = onSchedule({ schedule: "0 20 * * *", timeZone: "Europe/Prague" }, async () => {
  const now = new Date();
  if (dayOfMonthInFamilyZone(now) !== lastDayOfMonthInFamilyZone(now)) return;

  const db = getFirestore();
  const familiesSnapshot = await allInvestDemoEnabledFamilies(db);
  const roundKey = monthKeyInFamilyZone(now);

  for (const familyDoc of familiesSnapshot.docs) {
    const familyRef = familyDoc.ref;
    const portfoliosSnap = await familyRef.collection("investDemoPortfolios").get();
    if (portfoliosSnap.empty) continue;

    const participants: ContestParticipant[] = [];
    for (const portfolioDoc of portfoliosSnap.docs) {
      const portfolio = portfolioDoc.data() as InvestDemoPortfolio;
      const totalValueCzk = await liquidatePortfolio(db, familyRef, portfolioDoc.id);
      participants.push({
        userId: portfolioDoc.id,
        totalValueCzk,
        // A portfolio that predates roundStartCzk (hasn't been through a
        // reset yet) has no real "start of round" snapshot to compare
        // against — falling back to its *current* cashBalance would be
        // wrong here (cash shrinks the moment money moves into a holding,
        // regardless of whether that holding is up or down), so it would
        // wrongly look like growth for anyone holding a losing position.
        // Falling back to totalValueCzk itself means "no growth" (can't be
        // strictly greater than itself), never a false payout.
        roundStartCzk: portfolio.roundStartCzk ?? totalValueCzk,
      });
    }

    const standings = rankContestParticipants(participants);

    await db.runTransaction(async (tx) => {
      for (const standing of standings) {
        if (standing.xpAwarded <= 0) continue;
        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({ userId: standing.userId, delta: standing.xpAwarded, reason: "invest_demo_contest" })
        );
        tx.update(familyRef.collection("members").doc(standing.userId), {
          xpBalance: FieldValue.increment(standing.xpAwarded),
        });
      }
      tx.set(familyRef.collection("investDemoContestResults").doc(roundKey), {
        settledAt: Date.now(),
        standings,
      } satisfies Omit<InvestDemoContestResult, "id">);
    });

    const membersSnap = await familyRef.collection("members").get();
    const membersById = new Map(membersSnap.docs.map((d) => [d.id, d.data() as Member]));
    for (const [index, standing] of standings.entries()) {
      const member = membersById.get(standing.userId);
      if (!member) continue;
      const target: NotifyTarget = { userId: standing.userId, fcmToken: member.fcmToken };
      const balanceText = formatCzk(standing.totalValueCzk);
      const body =
        standing.xpAwarded > 0
          ? `🏆 Soutěž demo investování vyhodnocena — ${index + 1}. místo (${balanceText}), +${formatXp(standing.xpAwarded)} XP!`
          : `Soutěž demo investování vyhodnocena — tvůj zůstatek: ${balanceText}. Zkus to příští kolo znovu!`;
      await notifyMembers(familyDoc.id, "invest_demo_contest_settled", [target], "Family Quest", body, db);
    }
  }
});

/**
 * Starts the next contest round — the day after the last day of the month
 * (i.e. the 1st) at 09:00 Europe/Prague. The previous round's settlement
 * already liquidated every portfolio to cash (see
 * investDemoContestSettle/liquidatePortfolio), so this just snapshots that
 * post-liquidation cashBalance as the new round's roundStartCzk — the
 * threshold a portfolio has to grow past to actually get paid next time,
 * even if it ranks in the top 3 (see rankContestParticipants). No live
 * pricing needed since every portfolio is already pure cash at this point.
 */
export const investDemoContestReset = onSchedule({ schedule: "0 9 * * *", timeZone: "Europe/Prague" }, async () => {
  const now = new Date();
  if (dayOfMonthInFamilyZone(now) !== 1) return;

  const db = getFirestore();
  const familiesSnapshot = await allInvestDemoEnabledFamilies(db);

  for (const familyDoc of familiesSnapshot.docs) {
    const portfoliosSnap = await familyDoc.ref.collection("investDemoPortfolios").get();
    if (portfoliosSnap.empty) continue;

    for (const portfolioDoc of portfoliosSnap.docs) {
      const portfolio = portfolioDoc.data() as InvestDemoPortfolio;
      await portfolioDoc.ref.update({ roundStartCzk: portfolio.cashBalance, roundStartAt: Date.now() });
    }

    const membersSnap = await familyDoc.ref.collection("members").get();
    const membersById = new Map(membersSnap.docs.map((d) => [d.id, d.data() as Member]));
    const targets: NotifyTarget[] = portfoliosSnap.docs
      .map((d): NotifyTarget | null => {
        const member = membersById.get(d.id);
        return member ? { userId: d.id, fcmToken: member.fcmToken } : null;
      })
      .filter((t): t is NotifyTarget => t !== null);
    if (targets.length > 0) {
      await notifyMembers(
        familyDoc.id,
        "invest_demo_round_started",
        targets,
        "Family Quest",
        "🚀 Začalo nové kolo demo investování — minulý měsíc se otevřené pozice automaticky uzavřely na hotovost, teď se soutěží znovu od nuly.",
        db
      );
    }
  }
});

/**
 * Refreshes every portfolio's cached totalValueCzk four times a day
 * (00:00/06:00/12:00/18:00 Europe/Prague) — the leaderboard
 * (components/InvestDemoLeaderboard.tsx) reads this stored value directly
 * instead of fetching live quotes itself on every page view, which used
 * to mean every family member's device hitting Yahoo Finance independently
 * whenever the page was open. Doesn't touch cash/holdings — purely a
 * display refresh.
 */
export const investDemoValuationRefresh = onSchedule({ schedule: "0 0,6,12,18 * * *", timeZone: "Europe/Prague" }, async () => {
  const db = getFirestore();
  const familiesSnapshot = await allInvestDemoEnabledFamilies(db);

  for (const familyDoc of familiesSnapshot.docs) {
    const portfoliosSnap = await familyDoc.ref.collection("investDemoPortfolios").get();
    for (const portfolioDoc of portfoliosSnap.docs) {
      const portfolio = portfolioDoc.data() as InvestDemoPortfolio;
      const holdingsSnap = await portfolioDoc.ref.collection("holdings").get();
      const holdings = holdingsSnap.docs.map((d) => d.data() as InvestDemoHolding);
      const totalValueCzk = await computeTotalValueCzk(portfolio, holdings);
      await portfolioDoc.ref.update({ totalValueCzk, valuedAt: Date.now() });
    }
  }
});
