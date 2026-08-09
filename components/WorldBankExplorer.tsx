"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { buildIndicatorUrl, parseIndicatorValue, WORLD_BANK_INDICATORS } from "@/lib/world-bank";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

// A hand-picked, click-only list — no typing needed, matching how the rest
// of this section works (tap a country, see its numbers). World Bank's
// 2-letter country codes, same code space as lib/atlas.ts's AtlasCountry.id.
const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "CZ", name: "Česko", flag: "🇨🇿" },
  { code: "SK", name: "Slovensko", flag: "🇸🇰" },
  { code: "DE", name: "Německo", flag: "🇩🇪" },
  { code: "AT", name: "Rakousko", flag: "🇦🇹" },
  { code: "PL", name: "Polsko", flag: "🇵🇱" },
  { code: "FR", name: "Francie", flag: "🇫🇷" },
  { code: "GB", name: "Velká Británie", flag: "🇬🇧" },
  { code: "IT", name: "Itálie", flag: "🇮🇹" },
  { code: "ES", name: "Španělsko", flag: "🇪🇸" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "CN", name: "Čína", flag: "🇨🇳" },
  { code: "JP", name: "Japonsko", flag: "🇯🇵" },
  { code: "IN", name: "Indie", flag: "🇮🇳" },
  { code: "BR", name: "Brazílie", flag: "🇧🇷" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "ZA", name: "Jihoafrická republika", flag: "🇿🇦" },
  { code: "AU", name: "Austrálie", flag: "🇦🇺" },
];

interface IndicatorResult {
  label: string;
  formatted: string;
  year: string;
}

/** Informational-only World Bank country data browser (no XP) — click a country, get its key indicators. */
export default function WorldBankExplorer() {
  const toast = useToast();
  const [selected, setSelected] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [results, setResults] = useState<IndicatorResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelectCountry(country: (typeof COUNTRIES)[number]) {
    setSelected(country);
    setResults(null);
    setLoading(true);
    try {
      const values = await Promise.all(
        WORLD_BANK_INDICATORS.map(async (indicator) => {
          const res = await fetch(buildIndicatorUrl(country.code, indicator.id));
          if (!res.ok) return null;
          const point = parseIndicatorValue(await res.json());
          return point ? { label: indicator.label, formatted: indicator.format(point.value), year: point.year } : null;
        })
      );
      setResults(values.filter((v): v is IndicatorResult => v !== null));
    } catch (err) {
      toast.error(describeError(err, "Data se nepodařilo načíst."));
    } finally {
      setLoading(false);
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
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            type="button"
            onClick={() => handleSelectCountry(country)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              selected?.code === country.code ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            <span>{country.flag}</span> {country.name}
          </button>
        ))}
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
            {selected.flag} {selected.name}
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
        </div>
      )}
    </div>
  );
}
