"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Globe2 } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { COUNTRIES_DATA_URL, formatCapital, groupByContinent, parseCountries, type AtlasCountry } from "@/lib/atlas";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const CONTINENT_LABELS: Record<string, string> = {
  Europe: "Evropa",
  Asia: "Asie",
  Africa: "Afrika",
  Americas: "Amerika",
  Oceania: "Oceánie",
  Antarctic: "Antarktida",
};

const numberFormatter = new Intl.NumberFormat("cs-CZ");

function CountryDetails({ country }: { country: AtlasCountry }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-zinc-500">
      {country.subregion && (
        <p>
          <span className="text-zinc-400">Podregion:</span> {country.subregion}
        </p>
      )}
      {country.areaKm2 > 0 && (
        <p>
          <span className="text-zinc-400">Rozloha:</span> {numberFormatter.format(country.areaKm2)} km²
        </p>
      )}
      {country.languages.length > 0 && (
        <p>
          <span className="text-zinc-400">Jazyky:</span> {country.languages.join(", ")}
        </p>
      )}
      {country.currencies.length > 0 && (
        <p>
          <span className="text-zinc-400">Měna:</span> {country.currencies.join(", ")}
        </p>
      )}
      <p>
        <span className="text-zinc-400">Sousední státy:</span>{" "}
        {country.neighbors.length > 0 ? country.neighbors.join(", ") : "žádné (ostrovní stát)"}
      </p>
    </div>
  );
}

/** Browsable, informational country-by-continent list — separate from the atlas quiz below it. */
export default function AtlasCountryList() {
  const toast = useToast();
  const [countries, setCountries] = useState<AtlasCountry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(COUNTRIES_DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCountries(parseCountries(data));
      } catch (err) {
        if (!cancelled) toast.error(describeError(err, "Seznam států se nepodařilo načíst."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount only
  }, []);

  if (loading || !countries) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  const groups = groupByContinent(countries);

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(groups).map(([continent, list]) => (
        <details key={continent} className="rounded-xl border border-border">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 font-medium">
            <Globe2 size={16} className="text-accent" />
            {CONTINENT_LABELS[continent] ?? continent} <span className="text-sm font-normal text-zinc-500">({list.length})</span>
          </summary>
          <div className="flex flex-col gap-1 border-t border-border p-2">
            {list.map((country) => {
              const isExpanded = expandedId === country.id;
              return (
                <div key={country.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : country.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm"
                  >
                    {country.flag ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external flag image, not a static asset
                      <img src={country.flag} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <span className="h-4 w-6 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    <span className="shrink-0 text-zinc-500">{formatCapital(country.capital)}</span>
                    {isExpanded ? (
                      <ChevronUp size={14} className="shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronDown size={14} className="shrink-0 text-zinc-500" />
                    )}
                  </button>
                  {isExpanded && <CountryDetails country={country} />}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
