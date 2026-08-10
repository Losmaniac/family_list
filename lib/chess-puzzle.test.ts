import { describe, expect, it } from "vitest";
import { parseChessPuzzle } from "./chess-puzzle";

describe("parseChessPuzzle", () => {
  it("extracts the puzzle fields and just the movetext solution from the PGN", () => {
    const raw = {
      title: "All Roads Closed",
      url: "https://www.chess.com/daily/2026-08-09",
      publish_time: 1786258800,
      fen: "5K1B/4p3/P7/8/2P2P2/1k2P1n1/7P/7r w - - 0 1",
      pgn: '[White "Josten, Gerhard"]\n[Black "Study + Pawn on c4"]\n[FEN "5K1B/4p3/P7/8/2P2P2/1k2P1n1/7P/7r w - - 0 1"]\n\n1. a7 Rxh2 2. Bb2 Kxb2 3. Kg8 Nf5 4. a8=Q *',
      image: "https://www.chess.com/dynboard?fen=5K1B",
    };
    const puzzle = parseChessPuzzle(raw);
    expect(puzzle?.title).toBe("All Roads Closed");
    expect(puzzle?.fen).toBe(raw.fen);
    expect(puzzle?.imageUrl).toBe(raw.image);
    expect(puzzle?.solutionMoves).toBe("1. a7 Rxh2 2. Bb2 Kxb2 3. Kg8 Nf5 4. a8=Q *");
    expect(puzzle?.publishedDate).toBeTruthy();
  });

  it("returns null when a required field is missing or the response is malformed", () => {
    expect(parseChessPuzzle(null)).toBeNull();
    expect(parseChessPuzzle({})).toBeNull();
    expect(parseChessPuzzle({ title: "x", fen: "x", image: "x" })).toBeNull();
  });
});
