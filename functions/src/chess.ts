/**
 * Real playable chess against a built-in AI (see ../../lib/chess-ai.ts for
 * the move-picking search) — replaces the old chess.com daily-puzzle
 * viewer in Vzdělání. chess.js is the single source of truth for legality;
 * the client only ever sends a from/to/promotion and reads back the
 * resulting FEN, same "server decides, client just asks" trust model as
 * everywhere else XP moves.
 *
 * One game doc per member per difficulty (gameId = `${uid}_${difficulty}`)
 * — starting a new game overwrites any prior finished one. Winning always
 * ends the game and shows as a win, but the CHESS_WIN_XP reward for a given
 * difficulty is only credited once per family-zone day (functions/src/
 * chess.ts's own daily-cap check via chessProgress), same "let the activity
 * keep happening, just cap the reward" pattern as Vzdělání practice.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { Chess } from "chess.js";
import { CHESS_WIN_XP, pickAiMove, type ChessDifficulty } from "../../lib/chess-ai";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { dateKeyInFamilyZone } from "../../lib/date-utils";
import { requireAuth, requireFamilyMember } from "./practice";
import type { ChessGame, ChessGameStatus, ChessProgress } from "../../lib/types";

const DIFFICULTIES: ChessDifficulty[] = ["easy", "medium", "hard"];

function isChessDifficulty(value: unknown): value is ChessDifficulty {
  return typeof value === "string" && (DIFFICULTIES as string[]).includes(value);
}

interface DifficultyRequest {
  familyId: string;
  difficulty: ChessDifficulty;
}

export const startChessGame = onCall<DifficultyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, difficulty } = request.data;
  if (!familyId || !isChessDifficulty(difficulty)) {
    throw new HttpsError("invalid-argument", "familyId and a valid difficulty are required.");
  }
  await requireFamilyMember(familyId, uid);

  const now = Date.now();
  const chess = new Chess();
  const game: Omit<ChessGame, "id"> = {
    userId: uid,
    difficulty,
    fen: chess.fen(),
    history: [],
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  };

  const db = getFirestore();
  await db.collection("families").doc(familyId).collection("chessGames").doc(`${uid}_${difficulty}`).set(game);

  return { fen: game.fen, history: game.history, status: game.status };
});

interface SubmitMoveRequest {
  familyId: string;
  difficulty: ChessDifficulty;
  from: string;
  to: string;
  promotion?: string;
}

export const submitChessMove = onCall<SubmitMoveRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, difficulty, from, to, promotion } = request.data;
  if (!familyId || !isChessDifficulty(difficulty) || typeof from !== "string" || typeof to !== "string") {
    throw new HttpsError("invalid-argument", "familyId, difficulty, from and to are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const gameRef = familyRef.collection("chessGames").doc(`${uid}_${difficulty}`);
  const progressRef = familyRef.collection("chessProgress").doc(uid);
  const memberRef = familyRef.collection("members").doc(uid);
  const today = dateKeyInFamilyZone(new Date());

  return db.runTransaction(async (tx) => {
    const [gameSnap, progressSnap] = await Promise.all([tx.get(gameRef), tx.get(progressRef)]);
    const game = gameSnap.data() as ChessGame | undefined;
    if (!game || game.status !== "in_progress") {
      throw new HttpsError("failed-precondition", "Žádná probíhající hra — začni novou.");
    }

    const chess = new Chess(game.fen);
    let humanMove;
    try {
      humanMove = chess.move({ from, to, promotion });
    } catch {
      throw new HttpsError("invalid-argument", "Neplatný tah.");
    }

    const history = [...game.history, humanMove.san];
    let status: ChessGameStatus = "in_progress";
    let aiMove: string | undefined;

    if (chess.isCheckmate()) {
      status = "won";
    } else if (chess.isDraw() || chess.isStalemate()) {
      status = "draw";
    } else {
      aiMove = pickAiMove(chess.fen(), difficulty);
      chess.move(aiMove);
      history.push(aiMove);
      if (chess.isCheckmate()) {
        status = "lost";
      } else if (chess.isDraw() || chess.isStalemate()) {
        status = "draw";
      }
    }

    let xpAwarded = 0;
    let alreadyClaimedToday = false;
    if (status === "won") {
      const progress = progressSnap.data() as ChessProgress | undefined;
      const lastWinDate = progress?.lastWinDateByDifficulty?.[difficulty];
      if (lastWinDate === today) {
        alreadyClaimedToday = true;
      } else {
        xpAwarded = CHESS_WIN_XP[difficulty];
        tx.set(familyRef.collection("xpLedger").doc(), buildLedgerEntry({ userId: uid, delta: xpAwarded, reason: "chess_win" }));
        tx.update(memberRef, { xpBalance: FieldValue.increment(xpAwarded) });
        tx.set(progressRef, { lastWinDateByDifficulty: { ...(progress?.lastWinDateByDifficulty ?? {}), [difficulty]: today } }, { merge: true });
      }
    }

    const gameUpdate: Partial<ChessGame> = {
      fen: chess.fen(),
      history,
      status,
      updatedAt: Date.now(),
    };
    if (xpAwarded > 0) gameUpdate.xpAwarded = (game.xpAwarded ?? 0) + xpAwarded;
    tx.update(gameRef, gameUpdate);

    return { fen: chess.fen(), history, status, aiMove, xpAwarded, alreadyClaimedToday };
  });
});

export const resignChessGame = onCall<DifficultyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, difficulty } = request.data;
  if (!familyId || !isChessDifficulty(difficulty)) {
    throw new HttpsError("invalid-argument", "familyId and a valid difficulty are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const gameRef = db.collection("families").doc(familyId).collection("chessGames").doc(`${uid}_${difficulty}`);
  const snap = await gameRef.get();
  if (!snap.exists || (snap.data() as ChessGame).status !== "in_progress") {
    throw new HttpsError("failed-precondition", "Žádná probíhající hra.");
  }
  await gameRef.update({ status: "resigned", updatedAt: Date.now() });
  return { status: "resigned" };
});
