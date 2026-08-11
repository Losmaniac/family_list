"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DIFFICULTIES: { id: ChessDifficulty; label: string }[] = [
  { id: "easy", label: "Lehká" },
  { id: "medium", label: "Střední" },
  { id: "hard", label: "Těžká" },
];

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// chess.com's classic "green" board theme — a chessboard's own colors don't
// follow the app's light/dark theme, same as a real wooden board wouldn't.
const LIGHT_SQUARE = "#eeeed2";
const DARK_SQUARE = "#769656";
const SELECTED_HIGHLIGHT = "rgba(246, 246, 105, 0.75)";
const LAST_MOVE_HIGHLIGHT = "rgba(246, 246, 105, 0.5)";
const MOVE_DOT = "rgba(0, 0, 0, 0.22)";

// A single filled glyph set for both colors — telling white/black apart
// via font stroke/color tricks on the glyph itself (an earlier version of
// this component) rendered unreliably across devices, sometimes showing
// both sides as the same dark blob. A solid disc *behind* the glyph is far
// more robust: light disc + dark glyph for White, dark disc + light glyph
// for Black — plain background-color and text-color, nothing font-rendering-dependent.
const PIECE_GLYPHS: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };
const WHITE_DISC = "#fbfaf8";
const WHITE_GLYPH = "#2b2b2b";
const BLACK_DISC = "#2b2b2b";
const BLACK_GLYPH = "#fbfaf8";

function pieceDiscStyle(color: "w" | "b"): React.CSSProperties {
  return { backgroundColor: color === "w" ? WHITE_DISC : BLACK_DISC };
}

function pieceGlyphStyle(color: "w" | "b"): React.CSSProperties {
  return { color: color === "w" ? WHITE_GLYPH : BLACK_GLYPH };
}

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

/** How long the AI's reply stays freshly highlighted before it's safe to move again — long enough to actually notice which piece moved. */
const AI_MOVE_REVEAL_MS = 900;

/**
 * Real chess vs a built-in AI (lib/chess-ai.ts's negamax search runs
 * server-side in functions/src/chess.ts) — three difficulties, human is
 * always White. Board state is authoritative from Firestore (chessGames is
 * server-write-only), but rendering is driven by local `boardFen`/`highlight`
 * state rather than the Firestore doc directly: submitChessMove applies both
 * the human's move AND the AI's reply server-side in one write, so without
 * this the AI's move would just "appear" instantly with no way to see what
 * it was. playMove instead reconstructs the human-only position first (shown
 * immediately), then — after a short pause — applies the AI's reply locally
 * and highlights its from/to squares, before finally letting the Firestore
 * doc (already caught up) take over rendering again.
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
  const [boardFen, setBoardFen] = useState<string | undefined>(undefined);
  const [highlight, setHighlight] = useState<{ from?: Square; to?: Square }>({});
  const animatingRef = useRef(false);

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
    setBoardFen(undefined);
    setHighlight({});
  }

  useEffect(() => {
    if (!familyId || !user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "chessGames", `${user.uid}_${difficulty}`), (snap) => {
      setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as ChessGameDoc) : null);
    });
  }, [familyId, user, difficulty]);

  // The live Firestore doc only drives the board while no move animation is
  // in flight — playMove owns boardFen/highlight for the duration of its own
  // sequence, otherwise a Firestore update landing mid-animation would jump
  // straight to the final position and skip showing the AI's move.
  useEffect(() => {
    if (animatingRef.current) return;
    setBoardFen(game?.fen);
    setHighlight({});
  }, [game?.fen]);

  const chess = useMemo(() => {
    try {
      return new Chess(boardFen);
    } catch {
      return new Chess();
    }
  }, [boardFen]);

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
    if (!familyId || !game) return;
    const preMoveFen = game.fen;
    setBusy(true);
    setSelected(null);
    setPendingPromotion(null);
    animatingRef.current = true;
    try {
      const resultPromise = httpsCallable(getFirebaseFunctions(), "submitChessMove")({ familyId, difficulty, from, to, promotion });

      // Show the human's own move immediately — the server still validates
      // it, this is just so the tap feels instant rather than frozen while
      // waiting on the round trip.
      const afterHuman = new Chess(preMoveFen);
      afterHuman.move({ from, to, promotion });
      setBoardFen(afterHuman.fen());
      setHighlight({ from, to });

      const result = (await resultPromise).data as SubmitMoveResponse;

      if (result.aiMove) {
        await sleep(AI_MOVE_REVEAL_MS);
        const aiApplied = afterHuman.move(result.aiMove);
        setBoardFen(afterHuman.fen());
        setHighlight({ from: aiApplied.from, to: aiApplied.to });
        await sleep(AI_MOVE_REVEAL_MS);
      }

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
      setBoardFen(game.fen);
      setHighlight({});
    } finally {
      animatingRef.current = false;
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
          <div className="mx-auto grid aspect-square w-full max-w-sm grid-cols-8 auto-rows-fr overflow-hidden rounded-md shadow-md">
            {RANKS.map((rank) =>
              FILES.map((file) => {
                const square = `${file}${rank}` as Square;
                const piece = chess.get(square);
                const fileIndex = FILES.indexOf(file);
                const rankIndex = RANKS.indexOf(rank);
                const isDark = (fileIndex + rankIndex) % 2 === 1;
                const isSelected = selected === square;
                const isLastMove = highlight.from === square || highlight.to === square;
                const isDestination = legalDestinations.has(square);
                const isFirstFile = fileIndex === 0;
                const isLastRank = rankIndex === RANKS.length - 1;
                return (
                  <button
                    key={square}
                    type="button"
                    onClick={() => handleSquareClick(square)}
                    style={{ backgroundColor: isDark ? DARK_SQUARE : LIGHT_SQUARE }}
                    className="relative flex items-center justify-center text-2xl transition-colors sm:text-3xl"
                  >
                    {isLastMove && !isSelected && (
                      <span className="absolute inset-0" style={{ backgroundColor: LAST_MOVE_HIGHLIGHT }} />
                    )}
                    {isSelected && <span className="absolute inset-0" style={{ backgroundColor: SELECTED_HIGHLIGHT }} />}
                    {piece && (
                      <span
                        className="relative flex h-[78%] w-[78%] select-none items-center justify-center rounded-full shadow-sm transition-transform duration-300"
                        style={pieceDiscStyle(piece.color)}
                      >
                        <span style={pieceGlyphStyle(piece.color)}>{PIECE_GLYPHS[piece.type]}</span>
                      </span>
                    )}
                    {isDestination && !piece && (
                      <span className="absolute h-1/3 w-1/3 rounded-full" style={{ backgroundColor: MOVE_DOT }} />
                    )}
                    {isDestination && piece && (
                      <span className="absolute inset-1 rounded-full" style={{ boxShadow: `inset 0 0 0 4px ${MOVE_DOT}` }} />
                    )}
                    {isLastRank && (
                      <span
                        className="absolute bottom-0.5 left-1 text-[10px] font-semibold"
                        style={{ color: isDark ? LIGHT_SQUARE : DARK_SQUARE }}
                      >
                        {file}
                      </span>
                    )}
                    {isFirstFile && (
                      <span
                        className="absolute left-1 top-0.5 text-[10px] font-semibold"
                        style={{ color: isDark ? LIGHT_SQUARE : DARK_SQUARE }}
                      >
                        {rank}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {busy && <p className="text-center text-xs text-zinc-500">Počítač přemýšlí…</p>}
          {!busy && chess.isCheck() && <p className="text-center text-sm text-danger">Šach!</p>}

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
                  className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-2xl"
                  style={{ backgroundColor: DARK_SQUARE }}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full" style={pieceDiscStyle("w")}>
                    <span style={pieceGlyphStyle("w")}>{PIECE_GLYPHS[p.id]}</span>
                  </span>
                  <span className="text-xs text-white">{p.label}</span>
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
