"use client";

import { useEffect, useState } from "react";
import { CloudSun, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  buildForecastUrl,
  buildGeocodingUrl,
  parseForecast,
  parseGeocodedPlaces,
  weatherCodeInfo,
  type GeocodedPlace,
  type WeatherForecast,
} from "@/lib/open-meteo";

function citiesStorageKey(uid: string): string {
  return `weather-cities:${uid}`;
}

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const DAY_FORMATTER = new Intl.DateTimeFormat("cs-CZ", { weekday: "short" });

function CityCard({ place, onRemove }: { place: GeocodedPlace; onRemove: () => void }) {
  const toast = useToast();
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(buildForecastUrl(place.latitude, place.longitude));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = parseForecast(await res.json());
        if (!cancelled) setForecast(data);
      } catch (err) {
        if (!cancelled) toast.error(describeError(err, `Počasí pro ${place.name} se nepodařilo načíst.`));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the place itself changes, not on every toast identity change
  }, [place.id]);

  const current = forecast?.current ? weatherCodeInfo(forecast.current.weatherCode) : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{place.name}</p>
          <p className="text-xs text-zinc-500">{[place.admin1, place.country].filter(Boolean).join(", ")}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Odebrat ${place.name}`} className="text-zinc-400 hover:text-danger">
          <Trash2 size={16} />
        </button>
      </div>

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
      ) : forecast && current ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{current.icon}</span>
            <div>
              <p className="text-2xl font-semibold">{Math.round(forecast.current.temperature)}°C</p>
              <p className="text-sm text-zinc-500">
                {current.label} · vlhkost {forecast.current.humidity}% · vítr {Math.round(forecast.current.windSpeed)} km/h
              </p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {forecast.daily.map((day) => {
              const info = weatherCodeInfo(day.weatherCode);
              return (
                <div key={day.date} className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg bg-surface-muted px-2.5 py-2 text-xs">
                  <span className="font-medium capitalize">{DAY_FORMATTER.format(new Date(`${day.date}T00:00:00`))}</span>
                  <span className="text-base">{info.icon}</span>
                  <span>
                    {Math.round(day.max)}° / {Math.round(day.min)}°
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Počasí se nepodařilo načíst.</p>
      )}
    </div>
  );
}

export default function WeatherPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [cities, setCities] = useState<GeocodedPlace[]>([]);
  const [loadedCitiesForUid, setLoadedCitiesForUid] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Same "adjust state during render" pattern as the nav-order preference
  // in app/(dashboard)/layout.tsx — user is null during SSR/first paint,
  // so this only ever runs once auth actually resolves, no effect needed.
  if (user && loadedCitiesForUid !== user.uid) {
    setLoadedCitiesForUid(user.uid);
    const stored = typeof window !== "undefined" ? localStorage.getItem(citiesStorageKey(user.uid)) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setCities(parsed);
      } catch {
        // Corrupt/foreign value — ignore, keep the empty default.
      }
    }
  }

  function saveCities(next: GeocodedPlace[]) {
    setCities(next);
    if (user) localStorage.setItem(citiesStorageKey(user.uid), JSON.stringify(next));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(buildGeocodingUrl(query.trim()));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(parseGeocodedPlaces(data.results ?? []));
    } catch (err) {
      toast.error(describeError(err, "Vyhledávání se nezdařilo."));
    } finally {
      setSearching(false);
    }
  }

  function addCity(place: GeocodedPlace) {
    if (cities.some((c) => c.id === place.id)) {
      toast.error("Toto město už sleduješ.");
      return;
    }
    saveCities([...cities, place]);
    setShowSearch(false);
    setQuery("");
    setResults([]);
  }

  function removeCity(id: number) {
    saveCities(cities.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Počasí</h1>
        {!showSearch && (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <Plus size={16} /> Přidat město
          </button>
        )}
      </div>

      {showSearch && (
        <form onSubmit={handleSearch} className="flex flex-col gap-2 rounded-xl border border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Např. Brno"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <Search size={16} /> Hledat
            </button>
          </div>
          {results.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {results.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => addCity(place)}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <span>{place.name}</span>
                  <span className="text-zinc-500">{[place.admin1, place.country].filter(Boolean).join(", ")}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSearch(false)}
            className="self-start rounded-full border border-border px-4 py-1.5 text-sm font-semibold"
          >
            Zrušit
          </button>
        </form>
      )}

      {cities.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <CloudSun size={40} />
          <p className="text-lg">Zatím žádná sledovaná města.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cities.map((place) => (
            <CityCard key={place.id} place={place} onRemove={() => removeCity(place.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
