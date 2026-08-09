"use client";

import { useEffect, useState } from "react";
import { Landmark, Search } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import {
  buildCountryListUrl,
  buildIndicatorUrl,
  parseCountryList,
  parseIndicatorValue,
  WORLD_BANK_EXTRA_INDICATORS,
  WORLD_BANK_INDICATORS,
  type WorldBankCountry,
} from "@/lib/world-bank";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

// A hand-picked starter list — no typing needed to explore the countries a
// kid is most likely to already know. The search box below covers the rest
// of the ~215 countries World Bank tracks, fetched lazily on first use.
const FEATURED_COUNTRIES: WorldBankCountry[] = [
  { code: "CZ", name: "Česko" },
  { code: "SK", name: "Slovensko" },
  { code: "DE", name: "Německo" },
  { code: "AT", name: "Rakousko" },
  { code: "PL", name: "Polsko" },
  { code: "FR", name: "Francie" },
  { code: "GB", name: "Velká Británie" },
  { code: "IT", name: "Itálie" },
  { code: "ES", name: "Španělsko" },
  { code: "US", name: "USA" },
  { code: "CN", name: "Čína" },
  { code: "JP", name: "Japonsko" },
  { code: "IN", name: "Indie" },
  { code: "BR", name: "Brazílie" },
  { code: "EG", name: "Egypt" },
  { code: "ZA", name: "Jihoafrická republika" },
  { code: "AU", name: "Austrálie" },
];

const FLAG_OVERRIDES: Record<string, string> = Object.fromEntries(
  [
    ["CZ", "🇨🇿"],
    ["SK", "🇸🇰"],
    ["DE", "🇩🇪"],
    ["AT", "🇦🇹"],
    ["PL", "🇵🇱"],
    ["FR", "🇫🇷"],
    ["GB", "🇬🇧"],
    ["IT", "🇮🇹"],
    ["ES", "🇪🇸"],
    ["US", "🇺🇸"],
    ["CN", "🇨🇳"],
    ["JP", "🇯🇵"],
    ["IN", "🇮🇳"],
    ["BR", "🇧🇷"],
    ["EG", "🇪🇬"],
    ["ZA", "🇿🇦"],
    ["AU", "🇦🇺"],
  ]
);

/** ISO 3166-1 alpha-2 → flag emoji works for any two-letter code, not just the featured list, by shifting each letter into the "regional indicator symbol" block. */
function flagFor(code: string): string {
  if (FLAG_OVERRIDES[code]) return FLAG_OVERRIDES[code];
  if (code.length !== 2) return "🏳️";
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

interface IndicatorResult {
  label: string;
  formatted: string;
  year: string;
}

/** Informational-only World Bank country data browser (no XP) — click a country, get its key indicators. */
export default function WorldBankExplorer() {
  const toast = useToast();
  const [allCountries, setAllCountries] = useState<WorldBankCountry[] | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WorldBankCountry | null>(null);
  const [results, setResults] = useState<IndicatorResult[] | null>(null);
  const [extraResults, setExtraResults] = useState<IndicatorResult[] | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [loading, setLoading] = useState(false);

  const trimmedSearch = search.trim();

  // The full ~215-country list is fetched once, lazily, the first time
  // someone actually types into the search box — most visits never need it,
  // since the featured list above already covers the common cases.
  useEffect(() => {
    if (trimmedSearch.length < 2 || allCountries || loadingCountries) return;
    let cancelled = false;
    async function load() {
      setLoadingCountries(true);
      try {
        const res = await fetch(buildCountryListUrl());
        const data = await res.json();
        if (!cancelled) setAllCountries(parseCountryList(data));
      } catch (err) {
        if (!cancelled) toast.error(describeError(err, "Seznam zemí se nepodařilo načíst."));
      } finally {
        if (!cancelled) setLoadingCountries(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally fetch-once, not re-run per keystroke
  }, [trimmedSearch]);

  const searchResults =
    trimmedSearch.length < 2
      ? []
      : (allCountries ?? []).filter((c) => c.name.toLowerCase().includes(trimmedSearch.toLowerCase())).slice(0, 12);

  async function fetchIndicators(country: WorldBankCountry, indicators: typeof WORLD_BANK_INDICATORS) {
    const values = await Promise.all(
      indicators.map(async (indicator) => {
        const res = await fetch(buildIndicatorUrl(country.code, indicator.id));
        if (!res.ok) return null;
        const point = parseIndicatorValue(await res.json());
        return point ? { label: indicator.label, formatted: indicator.format(point.value), year: point.year } : null;
      })
    );
    return values.filter((v): v is IndicatorResult => v !== null);
  }

  async function handleSelectCountry(country: WorldBankCountry) {
    setSelected(country);
    setResults(null);
    setExtraResults(null);
    setShowExtra(false);
    setLoading(true);
    try {
      setResults(await fetchIndicators(country, WORLD_BANK_INDICATORS));
    } catch (err) {
      toast.error(describeError(err, "Data se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }

  async function handleShowExtra() {
    setShowExtra(true);
    if (!selected || extraResults) return;
    setLoadingExtra(true);
    try {
      setExtraResults(await fetchIndicators(selected, WORLD_BANK_EXTRA_INDICATORS));
    } catch (err) {
      toast.error(describeError(err, "Další metriky se nepodařilo načíst."));
    } finally {
      setLoadingExtra(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Klepni na zemi a podívej se na její čísla — kolik má obyvatel, jak velké je její hospodářství (HDP), jak
        dlouho lidé v průměru žijí, a další. Data pocházejí ze Světové banky, organizace, která tato čísla sbírá pro
        celý svět.
      </p>

      <div className="flex flex-wrap gap-2">
        {FEATURED_COUNTRIES.map((country) => (
          <button
            key={country.code}
            type="button"
            onClick={() => handleSelectCountry(country)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              selected?.code === country.code ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            <span>{flagFor(country.code)}</span> {country.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
          <Search size={16} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat další zemi…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {trimmedSearch.length >= 2 && (
          <div className="flex flex-wrap gap-2">
            {loadingCountries && <p className="text-sm text-zinc-500">Načítání seznamu zemí…</p>}
            {!loadingCountries && searchResults.length === 0 && (
              <p className="text-sm text-zinc-500">Žádná země s tímto názvem nenalezena.</p>
            )}
            {searchResults.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelectCountry(country)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                  selected?.code === country.code ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                <span>{flagFor(country.code)}</span> {country.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      )}

      {!loading && !selected && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <Landmark size={40} />
          <p className="text-lg">Vyber zemi nahoře.</p>
        </div>
      )}

      {!loading && selected && results && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            {flagFor(selected.code)} {selected.name}
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">Pro tuto zemi nejsou dostupná žádná data.</p>
          ) : (
            results.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.label}</p>
                  <p className="text-xs text-zinc-400">{r.year}</p>
                </div>
                <p className="shrink-0 font-semibold">{r.formatted}</p>
              </div>
            ))
          )}

          {!showExtra ? (
            <button
              type="button"
              onClick={handleShowExtra}
              className="self-start text-sm font-semibold text-accent"
            >
              Zobrazit další metriky
            </button>
          ) : loadingExtra ? (
            <div className="flex flex-col gap-2 pt-1">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              {(extraResults ?? []).length === 0 ? (
                <p className="text-sm text-zinc-500">Pro tuto zemi nejsou dostupné žádné další metriky.</p>
              ) : (
                extraResults!.map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{r.label}</p>
                      <p className="text-xs text-zinc-400">{r.year}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{r.formatted}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
