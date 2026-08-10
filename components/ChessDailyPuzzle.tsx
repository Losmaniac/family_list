"use client";

import { useEffect, useState } from "react";
import { Puzzle, Shuffle } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { CHESS_DAILY_PUZZLE_URL, CHESS_RANDOM_PUZZLE_URL, parseChessPuzzle, type ChessPuzzle } from "@/lib/chess-puzzle";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/** Informational-only chess.com daily puzzle browser (no XP) — figure out the winning move(s) yourself, then reveal the solution when ready. */
export default function ChessDailyPuzzle() {
  const toast = useToast();
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(CHESS_DAILY_PUZZLE_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parseChessPuzzle(await res.json());
        if (!cancelled) {
          if (!parsed) throw new Error("Neplatná odpověď");
          setPuzzle(parsed);
        }
      } catch (err) {
        if (!cancelled) toast.error(describeError(err, "Dnešní hádanku se nepodařilo načíst."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch-once on mount, not re-run per toast identity change
  }, []);

  async function handleShuffle() {
    setShuffling(true);
    setShowSolution(false);
    try {
      const res = await fetch(CHESS_RANDOM_PUZZLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseChessPuzzle(await res.json());
      if (!parsed) throw new Error("Neplatná odpověď");
      setPuzzle(parsed);
    } catch (err) {
      toast.error(describeError(err, "Další hádanku se nepodařilo načíst."));
    } finally {
      setShuffling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="aspect-square w-full max-w-sm animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
        <Puzzle size={40} />
        <p className="text-lg">Hádanku se nepodařilo načíst.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Kdo je na tahu, vyhraje — najdi vítězný tah (nebo sled tahů), pak si ověř řešení. Hádanky jsou z chess.com.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- external, dynamically-generated board image, not a static asset */}
      <img
        src={puzzle.imageUrl}
        alt={`Šachová hádanka: ${puzzle.title}`}
        className="w-full max-w-sm self-center rounded-xl border border-border"
      />
      <div>
        <p className="font-medium">{puzzle.title}</p>
        {puzzle.publishedDate && <p className="text-xs text-zinc-500">{puzzle.publishedDate}</p>}
      </div>

      {!showSolution ? (
        <button
          type="button"
          onClick={() => setShowSolution(true)}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Zobrazit řešení
        </button>
      ) : (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <p className="text-xs font-medium text-zinc-500">Řešení</p>
          <p className="font-mono text-sm">{puzzle.solutionMoves}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleShuffle}
        disabled={shuffling}
        className="flex items-center gap-1.5 self-start text-sm font-semibold text-accent disabled:opacity-50"
      >
        <Shuffle size={14} /> {shuffling ? "Načítám…" : "Zkusit jinou hádanku"}
      </button>
    </div>
  );
}
