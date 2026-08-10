/**
 * chess.com's public puzzle API (api.chess.com/pub/puzzle) — free, keyless,
 * CORS-enabled (verified via curl before building against it), so unlike
 * most other integrations in this module it's fetched directly from the
 * client, no Cloud Function proxy needed.
 */

export const CHESS_DAILY_PUZZLE_URL = "https://api.chess.com/pub/puzzle";
export const CHESS_RANDOM_PUZZLE_URL = "https://api.chess.com/pub/puzzle/random";

export interface ChessPuzzle {
  title: string;
  url: string;
  fen: string;
  imageUrl: string;
  solutionMoves: string;
  publishedDate: string;
}

interface RawChessPuzzle {
  title?: string;
  url?: string;
  fen?: string;
  image?: string;
  pgn?: string;
  publish_time?: number;
}

/** The PGN's movetext (everything after the last header's closing "]") is the actual solution — the headers above it just repeat metadata (title, date) already shown separately. */
function extractSolutionMoves(pgn: string): string {
  const lastBracket = pgn.lastIndexOf("]");
  return (lastBracket === -1 ? pgn : pgn.slice(lastBracket + 1)).replace(/\s+/g, " ").trim();
}

export function parseChessPuzzle(raw: unknown): ChessPuzzle | null {
  const r = raw as RawChessPuzzle | null | undefined;
  if (!r || !r.title || !r.fen || !r.image || !r.pgn) return null;
  return {
    title: r.title,
    url: r.url ?? "",
    fen: r.fen,
    imageUrl: r.image,
    solutionMoves: extractSolutionMoves(r.pgn),
    publishedDate: typeof r.publish_time === "number" ? new Date(r.publish_time * 1000).toLocaleDateString("cs-CZ") : "",
  };
}
