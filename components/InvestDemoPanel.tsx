"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { LineChart, Search, TrendingDown, TrendingUp } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  ASSET_TYPE_LABELS,
  formatCzk,
  roundMoney,
  type InvestDemoAsset,
  type InvestDemoAssetType,
} from "@/lib/invest-demo";
import type { InvestDemoHolding, InvestDemoTransaction } from "@/lib/types";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

interface TradeTarget {
  symbol: string;
  name: string;
  assetType: InvestDemoAssetType;
  side: "buy" | "sell";
  maxQuantity?: number;
}

function formatTransactionTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function InvestDemoPanel({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [holdings, setHoldings] = useState<InvestDemoHolding[]>([]);
  const [transactions, setTransactions] = useState<InvestDemoTransaction[]>([]);
  const [quotesBySymbol, setQuotesBySymbol] = useState<Record<string, number | null>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InvestDemoAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState("");
  const [trading, setTrading] = useState(false);

  useEffect(() => {
    if (!user) return;
    httpsCallable<{ familyId: string }, { cashBalance: number }>(getFirebaseFunctions(), "initInvestDemoPortfolio")({
      familyId,
    }).catch((err) => toast.error(describeError(err, "Demo portfolio se nepodařilo připravit.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount/uid, not on every toast identity change
  }, [familyId, user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "investDemoPortfolios", user.uid), (snap) => {
      setCashBalance(snap.exists() ? (snap.data().cashBalance as number) : null);
    });
  }, [familyId, user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(getDb(), "families", familyId, "investDemoPortfolios", user.uid, "holdings"), (snap) => {
      setHoldings(snap.docs.map((d) => d.data() as InvestDemoHolding));
    });
  }, [familyId, user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(getDb(), "families", familyId, "investDemoPortfolios", user.uid, "transactions"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InvestDemoTransaction));
    });
  }, [familyId, user]);

  const holdingSymbols = useMemo(() => holdings.map((h) => h.symbol).sort().join(","), [holdings]);

  async function fetchQuotesFor(symbols: string[]): Promise<Record<string, number | null>> {
    const result = await httpsCallable<{ familyId: string; symbols: string[] }, { quotes: { symbol: string; priceCzk: number | null }[] }>(
      getFirebaseFunctions(),
      "getInvestDemoQuotes"
    )({ familyId, symbols });
    return Object.fromEntries(result.data.quotes.map((q) => [q.symbol, q.priceCzk]));
  }

  async function refreshQuotes() {
    if (!holdingSymbols) return;
    setQuotesLoading(true);
    try {
      setQuotesBySymbol(await fetchQuotesFor(holdingSymbols.split(",")));
    } catch (err) {
      toast.error(describeError(err, "Aktuální ceny se nepodařilo načíst."));
    } finally {
      setQuotesLoading(false);
    }
  }

  useEffect(() => {
    if (!holdingSymbols) return;
    let cancelled = false;
    async function load() {
      setQuotesLoading(true);
      try {
        const quotes = await fetchQuotesFor(holdingSymbols.split(","));
        if (!cancelled) setQuotesBySymbol(quotes);
      } catch (err) {
        if (!cancelled) toast.error(describeError(err, "Aktuální ceny se nepodařilo načíst."));
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the actual symbol set changes, not on every toast/function-instance identity change
  }, [holdingSymbols]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    setSearched(true);
    try {
      const result = await httpsCallable<{ familyId: string; query: string }, { results: InvestDemoAsset[] }>(
        getFirebaseFunctions(),
        "searchInvestDemoAssets"
      )({ familyId, query: searchQuery.trim() });
      setSearchResults(result.data.results);
    } catch (err) {
      toast.error(describeError(err, "Hledání se nezdařilo."));
    } finally {
      setSearching(false);
    }
  }

  function openBuy(asset: InvestDemoAsset) {
    setTradeTarget({ symbol: asset.symbol, name: asset.name, assetType: asset.assetType, side: "buy" });
    setTradeQuantity("");
  }

  function openSell(holding: InvestDemoHolding) {
    setTradeTarget({ symbol: holding.symbol, name: holding.name, assetType: holding.assetType, side: "sell", maxQuantity: holding.quantity });
    setTradeQuantity(String(holding.quantity));
  }

  async function handleConfirmTrade() {
    if (!tradeTarget) return;
    const quantity = Number(tradeQuantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Zadej platné množství.");
      return;
    }
    setTrading(true);
    try {
      if (tradeTarget.side === "buy") {
        const result = await httpsCallable<
          { familyId: string; symbol: string; name: string; assetType: InvestDemoAssetType; quantity: number },
          { cashBalance: number; priceCzk: number }
        >(
          getFirebaseFunctions(),
          "buyInvestDemoAsset"
        )({ familyId, symbol: tradeTarget.symbol, name: tradeTarget.name, assetType: tradeTarget.assetType, quantity });
        toast.success(`Koupeno za ${formatCzk(result.data.priceCzk)}/ks.`);
      } else {
        const result = await httpsCallable<{ familyId: string; symbol: string; quantity: number }, { totalCzk: number; priceCzk: number }>(
          getFirebaseFunctions(),
          "sellInvestDemoAsset"
        )({ familyId, symbol: tradeTarget.symbol, quantity });
        toast.success(`Prodáno za ${formatCzk(result.data.totalCzk)}.`);
      }
      setTradeTarget(null);
      setTradeQuantity("");
    } catch (err) {
      toast.error(describeError(err, tradeTarget.side === "buy" ? "Nákup se nezdařil." : "Prodej se nezdařil."));
    } finally {
      setTrading(false);
    }
  }

  const holdingsValueCzk = holdings.reduce((sum, h) => {
    const price = quotesBySymbol[h.symbol];
    return sum + (price ?? h.avgCostCzk) * h.quantity;
  }, 0);
  const totalValueCzk = (cashBalance ?? 0) + holdingsValueCzk;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Zkus si investování nanečisto — s virtuálními penězi, ale se skutečnými cenami akcií, indexů a kryptoměn z
        trhu. Žádné skutečné peníze se nikde nepohybují.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-zinc-500">Hotovost</p>
          <p className="text-lg font-semibold">{cashBalance === null ? "…" : formatCzk(cashBalance)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-zinc-500">Hodnota pozic</p>
          <p className="text-lg font-semibold">{formatCzk(roundMoney(holdingsValueCzk))}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-accent/30 bg-accent/5 p-3 sm:col-span-1">
          <p className="text-xs text-zinc-500">Celkem</p>
          <p className="text-lg font-semibold">{formatCzk(roundMoney(totalValueCzk))}</p>
        </div>
      </div>

      {holdings.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500">Tvoje pozice</p>
            <button type="button" onClick={refreshQuotes} disabled={quotesLoading} className="text-xs text-accent disabled:opacity-50">
              {quotesLoading ? "Aktualizuji…" : "Obnovit ceny"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {holdings.map((h) => {
              const price = quotesBySymbol[h.symbol];
              const valueCzk = (price ?? h.avgCostCzk) * h.quantity;
              const gainCzk = price !== undefined && price !== null ? (price - h.avgCostCzk) * h.quantity : null;
              return (
                <div key={h.symbol} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{h.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {h.symbol} · {ASSET_TYPE_LABELS[h.assetType]} · {h.quantity} ks
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCzk(roundMoney(valueCzk))}</p>
                    {gainCzk !== null && (
                      <p className={`flex items-center justify-end gap-1 text-xs ${gainCzk >= 0 ? "text-success" : "text-danger"}`}>
                        {gainCzk >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {gainCzk >= 0 ? "+" : ""}
                        {formatCzk(roundMoney(gainCzk))}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openSell(h)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold"
                  >
                    Prodat
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Hledat akcii, index nebo kryptoměnu…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={searching}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          <Search size={16} /> Hledat
        </button>
      </form>

      {searching ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="flex flex-col gap-2">
          {searchResults.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{asset.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {asset.symbol} · {ASSET_TYPE_LABELS[asset.assetType]}
                  {asset.exchange ? ` · ${asset.exchange}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBuy(asset)}
                className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
              >
                Koupit
              </button>
            </div>
          ))}
        </div>
      ) : searched ? (
        <p className="text-sm text-zinc-500">Nic jsme nenašli — zkus jiný název nebo zkratku.</p>
      ) : null}

      {tradeTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setTradeTarget(null)}>
          <div
            className="flex w-full max-w-sm flex-col gap-3 rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">
              {tradeTarget.side === "buy" ? "Koupit" : "Prodat"} — {tradeTarget.name}
            </p>
            <p className="text-xs text-zinc-500">{tradeTarget.symbol} · Cena se ověří při odeslání.</p>
            <label className="flex flex-col gap-1 text-sm">
              Množství (kusů)
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(e.target.value)}
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
            </label>
            {tradeTarget.side === "sell" && tradeTarget.maxQuantity !== undefined && (
              <p className="text-xs text-zinc-500">Vlastníš {tradeTarget.maxQuantity} ks.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmTrade}
                disabled={trading}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                {trading ? "Odesílám…" : tradeTarget.side === "buy" ? "Koupit" : "Prodat"}
              </button>
              <button
                type="button"
                onClick={() => setTradeTarget(null)}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500">Historie obchodů</p>
          <div className="flex flex-col gap-1.5">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {t.side === "buy" ? "Koupeno" : "Prodáno"}: {t.quantity} ks {t.symbol}
                  </p>
                  <p className="text-xs text-zinc-400">{formatTransactionTime(t.timestamp)}</p>
                </div>
                <p className={`shrink-0 font-semibold ${t.side === "buy" ? "text-danger" : "text-success"}`}>
                  {t.side === "buy" ? "−" : "+"}
                  {formatCzk(t.totalCzk)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {holdings.length === 0 && transactions.length === 0 && !searched && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-zinc-500">
          <LineChart size={40} />
          <p className="text-lg">Zatím nic nevlastníš — zkus něco vyhledat výš.</p>
        </div>
      )}
    </div>
  );
}
