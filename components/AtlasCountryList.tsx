"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { groupByContinent, parseCountries, REST_COUNTRIES_URL, type AtlasCountry } from "@/lib/atlas";

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

/** Browsable, informational country-by-continent list (REST Countries) — separate from the atlas quiz below it. */
export default function AtlasCountryList() {
  const toast = useToast();
  const [countries, setCountries] = useState<AtlasCountry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(REST_COUNTRIES_URL);
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
            {list.map((country) => (
              <div key={country.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                {country.flag ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external flag image, not a static asset
                  <img src={country.flag} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover" />
                ) : (
                  <span className="h-4 w-6 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="shrink-0 text-zinc-500">{country.capital}</span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
