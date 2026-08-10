/**
 * A from-scratch AI opponent for the "Šachy" Vzdělání game (functions/src/
 * chess.ts calls this server-side after every human move — chess.js
 * handles legality/move-generation, this only picks which legal move the
 * AI plays). Kept dependency-free beyond chess.js itself so the search is
 * unit-testable without Firestore.
 *
 * Three difficulties, purely via search depth (+ a lighter easy mode that
 * mostly moves randomly) — no separate opening book or endgame tablebase,
 * appropriately modest for a family app's built-in opponent rather than a
 * real engine.
 */
import { Chess } from "chess.js";

export type ChessDifficulty = "easy" | "medium" | "hard";

/** XP a human earns for checkmating the AI at this difficulty — see functions/src/chess.ts for the once-per-day-per-difficulty cap. */
export const CHESS_WIN_XP: Record<ChessDifficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

const SEARCH_DEPTH: Record<Exclude<ChessDifficulty, "easy">, number> = {
  medium: 2,
  hard: 3,
};

const PIECE_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE_SCORE = 1_000_000;

/** Material balance only — positive favors White. Deliberately simple; the search depth is what separates the difficulties, not a fancier evaluation. */
function evaluateMaterial(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type];
      score += square.color === "w" ? value : -value;
    }
  }
  return score;
}

/**
 * Negamax with alpha-beta pruning — always returns a score from the
 * perspective of the side to move at `game`'s current position (higher is
 * better for whoever moves next). Checkmate/draw are checked before the
 * depth cutoff so a forced mate a few plies down is never missed just
 * because it falls past the search horizon.
 */
function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isCheckmate()) return -MATE_SCORE;
  if (game.isDraw() || game.isStalemate()) return 0;
  if (depth === 0) return evaluateMaterial(game) * (game.turn() === "w" ? 1 : -1);

  let best = -Infinity;
  for (const move of game.moves()) {
    game.move(move);
    const score = -negamax(game, depth - 1, -beta, -alpha);
    game.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Picks the AI's next move as a SAN string (e.g. "Nf3") for the position
 * given by `fen`. Throws if there are no legal moves — callers must check
 * game-over conditions first, same as chess.js itself.
 */
export function pickAiMove(fen: string, difficulty: ChessDifficulty, random: () => number = Math.random): string {
  const game = new Chess(fen);
  const moves = game.moves();
  if (moves.length === 0) throw new Error("pickAiMove called with no legal moves");

  if (difficulty === "easy") {
    // Mostly random — beatable by a beginner — but takes an undefended
    // free capture a chunk of the time, so it doesn't read as oblivious.
    const captures = game.moves({ verbose: true }).filter((m) => m.captured);
    if (captures.length > 0 && random() < 0.4) {
      return captures[Math.floor(random() * captures.length)].san;
    }
    return moves[Math.floor(random() * moves.length)];
  }

  const depth = SEARCH_DEPTH[difficulty];
  let bestScore = -Infinity;
  let bestMoves: string[] = [];
  for (const move of moves) {
    game.move(move);
    const score = -negamax(game, depth - 1, -Infinity, Infinity);
    game.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  // Ties broken randomly (injectable `random`) rather than always the
  // first-found move, so the same position doesn't always get the same
  // reply — a little variety without weakening the actual search.
  return bestMoves[Math.floor(random() * bestMoves.length)];
}
