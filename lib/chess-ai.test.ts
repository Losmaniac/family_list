import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { CHESS_WIN_XP, pickAiMove } from "./chess-ai";

describe("CHESS_WIN_XP", () => {
  it("ramps up with difficulty", () => {
    expect(CHESS_WIN_XP.easy).toBeLessThan(CHESS_WIN_XP.medium);
    expect(CHESS_WIN_XP.medium).toBeLessThan(CHESS_WIN_XP.hard);
  });
});

describe("pickAiMove", () => {
  it("always returns one of the position's legal moves", () => {
    const game = new Chess();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const move = pickAiMove(game.fen(), difficulty, () => 0.5);
      expect(game.moves()).toContain(move);
    }
  });

  it("is deterministic for a given random source", () => {
    const game = new Chess();
    const a = pickAiMove(game.fen(), "easy", () => 0.1);
    const b = pickAiMove(game.fen(), "easy", () => 0.1);
    expect(a).toBe(b);
  });

  it("medium/hard take an immediate free queen capture over ignoring it", () => {
    // White queen d4, black queen d8 undefended on the open d-file; black
    // king a8 is off the d-file/diagonal, too far to recapture on d8.
    const game = new Chess("k2q4/8/8/8/3Q4/8/8/K7 w - - 0 1");
    const move = pickAiMove(game.fen(), "hard", () => 0);
    expect(move).toBe("Qxd8+");
  });

  it("takes a forced mate-in-one when available", () => {
    // Black king boxed in on h8, white queen delivers mate on h7 (supported by the king on g6).
    const game = new Chess("7k/8/6K1/8/8/8/8/7Q w - - 0 1");
    const move = pickAiMove(game.fen(), "hard", () => 0);
    game.move(move);
    expect(game.isCheckmate()).toBe(true);
  });

  it("throws when there are no legal moves (checkmate/stalemate position)", () => {
    // Standard stalemate: black king on h8 has no legal moves, not in check.
    const game = new Chess("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1");
    expect(game.moves()).toHaveLength(0);
    expect(() => pickAiMove(game.fen(), "easy")).toThrow();
  });
});
