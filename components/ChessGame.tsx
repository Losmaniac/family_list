"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Chess, type Square } from "chess.js";
import { Crown, Flag, RotateCcw } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { CHESS_WIN_XP, type ChessDifficulty } from "@/lib/chess-ai";
import { formatXp } from "@/lib/xp-engine";
import type { ChessGame as ChessGameDoc } from "@/lib/types";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const DIFFICULTIES: { id: ChessDifficulty; label: string }[] = [
  { id: "easy", label: "Lehká" },
  { id: "medium", label: "Střední" },
  { id: "hard", label: "Těžká" },
];

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_GLYPHS: Record<string, Record<string, string>> = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const PROMOTION_PIECES: { id: string; label: string }[] = [
  { id: "q", label: "Dáma" },
  { id: "r", label: "Věž" },
  { id: "b", label: "Střelec" },
  { id: "n", label: "Kůň" },
];

interface SubmitMoveResponse {
  fen: string;
  history: string[];
  status: ChessGameDoc["status"];
  aiMove?: string;
  xpAwarded: number;
  alreadyClaimedToday: boolean;
}

/**
 * Real chess vs a built-in AI (lib/chess-ai.ts's negamax search runs
 * server-side in functions/src/chess.ts) — three difficulties, human is
 * always White. Board state is authoritative from Firestore (chessGames is
 * server-write-only), this component only sends from/to/promotion and
 * renders whatever comes back. A local chess.js instance mirrors the FEN
 * purely to compute legal destinations for the currently selected square —
 * the server re-validates every move regardless.
 */
export default function ChessGame() {
  const { user } = useAuth();
  const { familyId } = useFamily();
  const toast = useToast();

  const [difficulty, setDifficulty] = useState<ChessDifficulty>("easy");
  const [game, setGame] = useState<ChessGameDoc | null | undefined>(undefined);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset local UI state during render when the difficulty (or user) we're
  // showing a game for changes — the React-recommended "adjusting state
  // when a prop changes" pattern, so the stale previous difficulty's board
  // never flashes before the new one's onSnapshot below fires.
  const gameKey = `${familyId ?? ""}:${user?.uid ?? ""}:${difficulty}`;
  const [loadedKey, setLoadedKey] = useState(gameKey);
  if (loadedKey !== gameKey) {
    setLoadedKey(gameKey);
    setGame(undefined);
    setSelected(null);
    setPendingPromotion(null);
  }

  useEffect(() => {
    if (!familyId || !user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "chessGames", `${user.uid}_${difficulty}`), (snap) => {
      setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as ChessGameDoc) : null);
    });
  }, [familyId, user, difficulty]);

  const chess = useMemo(() => {
    try {
      return new Chess(game?.fen);
    } catch {
      return new Chess();
    }
  }, [game?.fen]);

  const inProgress = game?.status === "in_progress";
  const legalDestinations = useMemo(() => {
    if (!selected || !inProgress) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [chess, selected, inProgress]);

  async function startGame() {
    if (!familyId) return;
    setBusy(true);
    try {
      await httpsCallable(getFirebaseFunctions(), "startChessGame")({ familyId, difficulty });
    } catch (err) {
      toast.error(describeError(err, "Hru se nepodařilo založit."));
    } finally {
      setBusy(false);
    }
  }

  async function playMove(from: Square, to: Square, promotion?: string) {
    if (!familyId) return;
    setBusy(true);
    setSelected(null);
    setPendingPromotion(null);
    try {
      const result = (
        await httpsCallable(getFirebaseFunctions(), "submitChessMove")({ familyId, difficulty, from, to, promotion })
      ).data as SubmitMoveResponse;
      if (result.status === "won") {
        toast.success(
          result.alreadyClaimedToday
            ? "Vyhrál jsi! (XP za tuto obtížnost jsi dnes už vyčerpal)"
            : `Vyhrál jsi! +${formatXp(result.xpAwarded)} XP`
        );
      } else if (result.status === "lost") {
        toast.error("Prohrál jsi — zkus to znovu.");
      } else if (result.status === "draw") {
        toast.success("Remíza.");
      }
    } catch (err) {
      toast.error(describeError(err, "Tah se nezdařil."));
    } finally {
      setBusy(false);
    }
  }

  function handleSquareClick(square: Square) {
    if (!inProgress || busy) return;
    const piece = chess.get(square);

    if (selected && legalDestinations.has(square)) {
      const movingPiece = chess.get(selected);
      const isPromotion = movingPiece?.type === "p" && (square[1] === "8" || square[1] === "1");
      if (isPromotion) {
        setPendingPromotion({ from: selected, to: square });
      } else {
        playMove(selected, square);
      }
      return;
    }

    if (piece && piece.color === "w") {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  }

  if (!familyId || game === undefined) {
    return <div className="aspect-square w-full max-w-sm animate-pulse rounded-xl bg-surface-muted" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDifficulty(d.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              difficulty === d.id ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            {d.label} · {formatXp(CHESS_WIN_XP[d.id])} XP
          </button>
        ))}
      </div>

      {!inProgress && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center">
          {game?.status === "won" && <p className="text-sm">🏆 Vyhrál jsi poslední hru na této obtížnosti.</p>}
          {game?.status === "lost" && <p className="text-sm">Prohrál jsi poslední hru na této obtížnosti.</p>}
          {game?.status === "draw" && <p className="text-sm">Poslední hra na této obtížnosti skončila remízou.</p>}
          {game?.status === "resigned" && <p className="text-sm">Poslední hru na této obtížnosti jsi vzdal.</p>}
          <button
            type="button"
            disabled={busy}
            onClick={startGame}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Crown size={16} />
            {game ? "Nová hra" : "Začít hru"}
          </button>
        </div>
      )}

      {inProgress && (
        <>
          <div className="mx-auto grid aspect-square w-full max-w-sm grid-cols-8 overflow-hidden rounded-xl border border-border">
            {RANKS.map((rank) =>
              FILES.map((file) => {
                const square = `${file}${rank}` as Square;
                const piece = chess.get(square);
                const isDark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
                const isSelected = selected === square;
                const isDestination = legalDestinations.has(square);
                return (
                  <button
                    key={square}
                    type="button"
                    onClick={() => handleSquareClick(square)}
                    className={`relative flex items-center justify-center text-2xl sm:text-3xl ${
                      isDark ? "bg-surface-muted" : "bg-surface"
                    } ${isSelected ? "ring-2 ring-inset ring-accent" : ""}`}
                  >
                    {piece && <span>{PIECE_GLYPHS[piece.color][piece.type]}</span>}
                    {isDestination && !piece && <span className="absolute h-2.5 w-2.5 rounded-full bg-accent/60" />}
                    {isDestination && piece && <span className="absolute inset-0 ring-2 ring-inset ring-accent/60" />}
                  </button>
                );
              })
            )}
          </div>

          {chess.isCheck() && <p className="text-center text-sm text-danger">Šach!</p>}

          <div className="flex justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!familyId) return;
                setBusy(true);
                try {
                  await httpsCallable(getFirebaseFunctions(), "resignChessGame")({ familyId, difficulty });
                } catch (err) {
                  toast.error(describeError(err, "Vzdání se nezdařilo."));
                } finally {
                  setBusy(false);
                }
              }}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <Flag size={14} />
              Vzdát hru
            </button>
          </div>
        </>
      )}

      {pendingPromotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
            <p className="text-sm font-medium">Na co proměnit pěšce?</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => playMove(pendingPromotion.from, pendingPromotion.to, p.id)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-2 text-2xl"
                >
                  {PIECE_GLYPHS.w[p.id]}
                  <span className="text-xs">{p.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPendingPromotion(null)} className="flex items-center justify-center gap-1 text-xs text-zinc-500">
              <RotateCcw size={12} />
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
