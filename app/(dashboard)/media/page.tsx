"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Heart, Pause, Play, Radio as RadioIcon, Search, Tv } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { isFavorite, toggleFavorite } from "@/lib/media-favorites";
import { billableBlocksElapsed, DEFAULT_MEDIA_GRACE_PERIOD_MINUTES, MEDIA_XP_COST_PER_BLOCK, type MediaKind } from "@/lib/media-billing";
import { formatXp } from "@/lib/xp-engine";
import {
  buildStationsSearchUrl,
  buildTopCountriesUrl as buildTopRadioCountriesUrl,
  buildTopTagsUrl,
  parseFacets,
  parseStations,
  type RadioFacet,
  type RadioStation,
} from "@/lib/radio-browser";
import {
  categoriesUrl,
  channelsUrl,
  countriesUrl as tvCountriesUrl,
  filterChannels,
  joinChannelsWithStreams,
  parseCategories,
  parseCountries,
  streamsUrl,
  type CategoryOption,
  type CountryOption,
  type TvChannel,
} from "@/lib/iptv-org";
function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const TV_RESULT_LIMIT = 60;
// How often to check whether a new billable block has started — fine
// enough that a charge lands within a few seconds of crossing the
// threshold, coarse enough not to hammer the callable.
const BILLING_CHECK_INTERVAL_MS = 5000;

type MediaTab = "radio" | "tv";

/**
 * Charges XP for a Rádio/TV stream while it plays — see lib/media-billing.ts
 * for the free-grace-period + per-block schedule. `toast`/`onInsufficientFunds`
 * are captured via refs rather than effect dependencies since useToast()
 * returns a new object every render (including it directly would restart
 * the billing timer, and the elapsed-time tracking, on every render).
 */
// How often the on-screen elapsed-time counter refreshes — independent of
// BILLING_CHECK_INTERVAL_MS (the actual charge check), just often enough to
// feel live.
const ELAPSED_TICK_INTERVAL_MS = 1000;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Charges XP for a Rádio/TV stream while it plays — see lib/media-billing.ts
 * for the free-grace-period + per-block schedule. `toast`/`onInsufficientFunds`
 * are captured via refs rather than effect dependencies since useToast()
 * returns a new object every render (including it directly would restart
 * the billing timer, and the elapsed-time tracking, on every render).
 * Also reports elapsed playback time and XP spent so far, so the mini
 * player can show the listener a running tally instead of the charge
 * happening invisibly in the background.
 */
function useMediaBilling(
  familyId: string | null,
  kind: MediaKind,
  playingId: string | null,
  playingName: string | null,
  onInsufficientFunds: () => void,
  gracePeriodMinutes: number,
  costPerBlock: number
) {
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });
  const onInsufficientFundsRef = useRef(onInsufficientFunds);
  useEffect(() => {
    onInsufficientFundsRef.current = onInsufficientFunds;
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [chargedBlocks, setChargedBlocks] = useState(0);
  // Reset the counters the moment `playingId` itself changes (a fresh
  // station/channel starting, or playback stopping) — done during render
  // (React's documented pattern for "adjust state when a prop changes")
  // rather than as a synchronous setState call at the top of the effect
  // below, so it doesn't trigger an extra cascading render.
  const [trackedPlayingId, setTrackedPlayingId] = useState(playingId);
  if (playingId !== trackedPlayingId) {
    setTrackedPlayingId(playingId);
    setElapsedMs(0);
    setChargedBlocks(0);
  }

  useEffect(() => {
    if (!familyId || !playingId) return;
    const startedAt = Date.now();
    let charged = 0;
    let cancelled = false;

    const tickInterval = setInterval(() => {
      if (!cancelled) setElapsedMs(Date.now() - startedAt);
    }, ELAPSED_TICK_INTERVAL_MS);

    const billingInterval = setInterval(async () => {
      const due = billableBlocksElapsed(Date.now() - startedAt, gracePeriodMinutes);
      while (!cancelled && charged < due) {
        try {
          const result = await httpsCallable<{ familyId: string; kind: MediaKind; channelName?: string }, { charged: boolean }>(
            getFirebaseFunctions(),
            "chargeMediaListening"
          )({ familyId, kind, channelName: playingName ?? undefined });
          if (cancelled) return;
          if (!result.data.charged) {
            toastRef.current.error(
              kind === "radio" ? "Došly ti XP na poslech — přehrávání bylo zastaveno." : "Došly ti XP na sledování — přehrávání bylo zastaveno."
            );
            onInsufficientFundsRef.current();
            return;
          }
          charged += 1;
          setChargedBlocks(charged);
        } catch {
          // Best-effort — a transient failure is retried on the next tick rather than interrupting playback.
          break;
        }
      }
    }, BILLING_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
      clearInterval(billingInterval);
    };
  }, [familyId, kind, playingId, playingName, gracePeriodMinutes]);

  return { elapsedSeconds: Math.floor(elapsedMs / 1000), spentXp: chargedBlocks * costPerBlock };
}

/** A heart toggle shared by the play/pause button pattern — same shape, different fill state, no play/pause side effects of its own. */
function FavoriteButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        active ? "text-danger" : "text-zinc-400"
      }`}
    >
      <Heart size={18} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

function StationRow({
  station,
  isPlaying,
  isFavorite,
  onTogglePlay,
  onToggleFavorite,
}: {
  station: RadioStation;
  isPlaying: boolean;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      {station.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain station icons, not a static asset
        <img src={station.favicon} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-zinc-400">
          <RadioIcon size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{station.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {[station.country, station.tags.slice(0, 3).join(", "), station.bitrate ? `${station.bitrate} kbps` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pozastavit" : "Přehrát"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isPlaying ? "bg-accent text-accent-foreground" : "bg-surface-muted text-accent"
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  );
}

function RadioTab() {
  const toast = useToast();
  const { user } = useAuth();
  const { familyId, member, family } = useFamily();
  const gracePeriodMinutes = family?.mediaGracePeriodMinutes ?? DEFAULT_MEDIA_GRACE_PERIOD_MINUTES;
  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
  const [tag, setTag] = useState("");
  const [countries, setCountries] = useState<RadioFacet[]>([]);
  const [tags, setTags] = useState<RadioFacet[]>([]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playing, setPlaying] = useState<RadioStation | null>(null);
  const favorites = member?.favoriteRadioStations ?? [];

  const radioCostPerBlock = family?.mediaXpCostPerBlock?.radio ?? MEDIA_XP_COST_PER_BLOCK.radio;
  const { elapsedSeconds, spentXp } = useMediaBilling(
    familyId,
    "radio",
    playing?.id ?? null,
    playing?.name ?? null,
    () => setPlaying(null),
    gracePeriodMinutes,
    radioCostPerBlock
  );

  useEffect(() => {
    async function loadFacets() {
      try {
        const [countriesRes, tagsRes] = await Promise.all([fetch(buildTopRadioCountriesUrl()), fetch(buildTopTagsUrl())]);
        setCountries(parseFacets(await countriesRes.json()));
        setTags(parseFacets(await tagsRes.json()));
      } catch {
        // Filters are a nice-to-have — search still works with free-text name entry alone.
      }
    }
    loadFacets();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        buildStationsSearchUrl({ name: nameQuery || undefined, country: country || undefined, tag: tag || undefined })
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStations(parseStations(await res.json()));
    } catch (err) {
      toast.error(describeError(err, "Stanice se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }

  function togglePlay(station: RadioStation) {
    setPlaying((prev) => (prev?.id === station.id ? null : station));
  }

  async function handleToggleFavorite(station: RadioStation) {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        favoriteRadioStations: toggleFavorite(favorites, station),
      });
    } catch {
      toast.error("Oblíbenou stanici se nepodařilo uložit.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Poslech stojí XP: prvních {gracePeriodMinutes} min zdarma, poté {formatXp(radioCostPerBlock)} XP za každých započatých 5 minut.
      </p>

      {playing && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          <RadioIcon size={18} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{playing.name}</p>
            <p className="text-xs text-zinc-500">
              {formatElapsed(elapsedSeconds)} · {spentXp > 0 ? `−${formatXp(spentXp)} XP` : "zdarma"}
            </p>
          </div>
          <audio
            key={playing.id}
            src={playing.streamUrl}
            autoPlay
            controls
            onEnded={() => setPlaying(null)}
            onError={() => {
              toast.error("Stream se nepodařilo přehrát.");
              setPlaying(null);
            }}
            className="h-9 max-w-[60%]"
          />
        </div>
      )}

      {favorites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500">Oblíbené</p>
          <div className="flex flex-col gap-2">
            {favorites.map((station) => (
              <StationRow
                key={station.id}
                station={station}
                isPlaying={playing?.id === station.id}
                isFavorite
                onTogglePlay={() => togglePlay(station)}
                onToggleFavorite={() => handleToggleFavorite(station)}
              />
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Hledat stanici…"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            <Search size={16} /> Hledat
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Všechny země</option>
            {countries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Všechny žánry</option>
            {tags.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.count})
              </option>
            ))}
          </select>
        </div>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <RadioIcon size={40} />
          <p className="text-lg">{searched ? "Žádné stanice nenalezeny." : "Vyhledej nebo filtruj stanice."}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stations.map((station) => (
            <StationRow
              key={station.id}
              station={station}
              isPlaying={playing?.id === station.id}
              isFavorite={isFavorite(favorites, station.id)}
              onTogglePlay={() => togglePlay(station)}
              onToggleFavorite={() => handleToggleFavorite(station)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelRow({
  channel,
  isPlaying,
  isFavorite,
  onTogglePlay,
  onToggleFavorite,
}: {
  channel: TvChannel;
  isPlaying: boolean;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
      {channel.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain channel logos, not a static asset
        <img src={channel.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-zinc-400">
          <Tv size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{channel.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {[channel.country, channel.categories.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
        </p>
      </div>
      <FavoriteButton active={isFavorite} onToggle={onToggleFavorite} />
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Zavřít" : "Přehrát"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isPlaying ? "bg-accent text-accent-foreground" : "bg-surface-muted text-accent"
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  );
}

function TvTab() {
  const toast = useToast();
  const { user } = useAuth();
  const { familyId, member, family } = useFamily();
  const gracePeriodMinutes = family?.mediaGracePeriodMinutes ?? DEFAULT_MEDIA_GRACE_PERIOD_MINUTES;
  const [nameQuery, setNameQuery] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allChannels, setAllChannels] = useState<TvChannel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playing, setPlaying] = useState<TvChannel | null>(null);
  const favorites = member?.favoriteTvChannels ?? [];

  const tvCostPerBlock = family?.mediaXpCostPerBlock?.tv ?? MEDIA_XP_COST_PER_BLOCK.tv;
  const { elapsedSeconds, spentXp } = useMediaBilling(
    familyId,
    "tv",
    playing?.id ?? null,
    playing?.name ?? null,
    () => setPlaying(null),
    gracePeriodMinutes,
    tvCostPerBlock
  );

  useEffect(() => {
    async function loadFacets() {
      try {
        const [countriesRes, categoriesRes] = await Promise.all([fetch(tvCountriesUrl()), fetch(categoriesUrl())]);
        setCountries(parseCountries(await countriesRes.json()));
        setCategories(parseCategories(await categoriesRes.json()));
      } catch {
        // Filters are a nice-to-have — search still works with free-text name entry alone.
      }
    }
    loadFacets();
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      // channels.json + streams.json are large static files with no
      // server-side filtering — fetched once and cached, every further
      // search just re-filters the already-downloaded data client-side.
      let channels = allChannels;
      if (!channels) {
        const [channelsRes, streamsRes] = await Promise.all([fetch(channelsUrl()), fetch(streamsUrl())]);
        if (!channelsRes.ok || !streamsRes.ok) throw new Error("HTTP error");
        channels = joinChannelsWithStreams(await channelsRes.json(), await streamsRes.json());
        setAllChannels(channels);
      }
    } catch (err) {
      toast.error(describeError(err, "Kanály se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }

  function togglePlay(channel: TvChannel) {
    setPlaying((prev) => (prev?.id === channel.id ? null : channel));
  }

  async function handleToggleFavorite(channel: TvChannel) {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        favoriteTvChannels: toggleFavorite(favorites, channel),
      });
    } catch {
      toast.error("Oblíbený kanál se nepodařilo uložit.");
    }
  }

  const filtered = allChannels
    ? filterChannels(allChannels, { name: nameQuery || undefined, country: country || undefined, category: category || undefined }).slice(
        0,
        TV_RESULT_LIMIT
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Sledování stojí XP: prvních {gracePeriodMinutes} min zdarma, poté {formatXp(tvCostPerBlock)} XP za každých započatých 5 minut.
      </p>

      {favorites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500">Oblíbené</p>
          <div className="flex flex-col gap-2">
            {favorites.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                isPlaying={playing?.id === channel.id}
                isFavorite
                onTogglePlay={() => togglePlay(channel)}
                onToggleFavorite={() => handleToggleFavorite(channel)}
              />
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Hledat kanál…"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            <Search size={16} /> Hledat
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Všechny země</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">Všechny kategorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <Tv size={40} />
          <p className="text-lg">{searched ? "Žádné kanály nenalezeny." : "Vyhledej nebo filtruj kanály."}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allChannels && filterChannels(allChannels, {}).length > 0 && filtered.length === TV_RESULT_LIMIT && (
            <p className="text-xs text-zinc-500">Zobrazeno prvních {TV_RESULT_LIMIT} — zpřesni hledání pro víc výsledků.</p>
          )}
          {filtered.map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              isPlaying={playing?.id === channel.id}
              isFavorite={isFavorite(favorites, channel.id)}
              onTogglePlay={() => togglePlay(channel)}
              onToggleFavorite={() => handleToggleFavorite(channel)}
            />
          ))}
        </div>
      )}

      {playing &&
        createPortal(
          // Portaled to <body> — see the identical comment in
          // InvestDemoPanel's trade drawer for why a `fixed inset-0 z-50`
          // nested inside this page's <main> can't out-rank the bottom nav.
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPlaying(null)}
          >
            <div className="flex w-full max-w-lg flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <p className="truncate text-center text-sm font-medium text-white">{playing.name}</p>
              <p className="text-center text-xs text-white/70">
                {formatElapsed(elapsedSeconds)} · {spentXp > 0 ? `−${formatXp(spentXp)} XP` : "zdarma"}
              </p>
              <video
                key={playing.id}
                src={playing.streamUrl}
                autoPlay
                controls
                playsInline
                onError={() => {
                  toast.error("Vysílání se nepodařilo přehrát — zkus jiný kanál.");
                  setPlaying(null);
                }}
                className="w-full rounded-lg"
              />
              <button
                type="button"
                onClick={() => setPlaying(null)}
                className="self-center rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white"
              >
                Zavřít
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function MediaPage() {
  const [tab, setTab] = useState<MediaTab>("radio");

  return (
    <div className="flex flex-col gap-4 pb-24">
      <h1 className="text-xl font-semibold">Média</h1>
      <p className="text-sm text-zinc-500">Internetové rádio a TV kanály, zdarma.</p>

      <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab("radio")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
            tab === "radio" ? "bg-accent text-accent-foreground" : "text-zinc-500"
          }`}
        >
          <RadioIcon size={15} /> Rádio
        </button>
        <button
          type="button"
          onClick={() => setTab("tv")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
            tab === "tv" ? "bg-accent text-accent-foreground" : "text-zinc-500"
          }`}
        >
          <Tv size={15} /> TV
        </button>
      </div>

      {tab === "radio" ? <RadioTab /> : <TvTab />}
    </div>
  );
}
