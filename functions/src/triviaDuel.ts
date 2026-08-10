/**
 * "Kvízový souboj" — one family member challenges another to a head-to-head
 * quiz, each pledging their own XP stake. Both sides answer the exact same
 * questions, asynchronously (there's no live/simultaneous play) — the
 * question set (and each side's live progress/score) lives entirely
 * server-side in `triviaDuelState/{duelId}`, which has no client-facing
 * Firestore rule at all, so neither player can peek at upcoming questions
 * or the opponent's running score. The public `triviaDuels/{duelId}` doc
 * only ever shows final scores once the duel is actually settled.
 *
 * Questions are drawn from the exact same subject banks as regular
 * Vzdělání practice (see lib/practice.ts's SUBJECT_PICKERS, exported for
 * this reuse) — "otázky ze stejných okruhů co jsou v aplikaci" — picking a
 * random sync subject per question and excluding ids already used within
 * this same duel, so the two players always get an identical set.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { isAnswerCorrect, primaryAnswer, type PracticeProblem } from "../../lib/practice";
import { determineDuelWinner, settlementTransfer } from "../../lib/trivia-duel";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { requireAuth, requireFamilyMember, SUBJECT_PICKERS, type SyncSubject } from "./practice";
import type { Member, TriviaDuel } from "../../lib/types";

const QUESTION_COUNT_OPTIONS = [5, 8, 10] as const;
const MAX_STAKE = 100_000;

interface StoredQuestion {
  id: string;
  question: string;
  answer: string | string[];
  options?: [string, string, string];
}

interface DuelState {
  questions: StoredQuestion[];
  challengerIndex: number;
  challengerScore: number;
  challengerDone: boolean;
  opponentIndex: number;
  opponentScore: number;
  opponentDone: boolean;
}

function validStake(stake: unknown): stake is number {
  return typeof stake === "number" && Number.isFinite(stake) && Number.isInteger(stake) && stake > 0 && stake <= MAX_STAKE;
}

/** Draws `count` questions across the sync practice subjects, each picked uniformly at random, retrying a different subject if one comes up empty — the same bank a member would see practicing solo, just assembled once for both duelists to share. */
function buildQuestionSet(count: number): StoredQuestion[] {
  const subjects = Object.keys(SUBJECT_PICKERS) as SyncSubject[];
  const excludeIds = new Set<string>();
  const questions: StoredQuestion[] = [];

  for (let i = 0; i < count; i++) {
    let picked: PracticeProblem | undefined;
    // A handful of retries across random subjects is enough in practice —
    // if every subject's remaining pool is exhausted, we simply stop early
    // with fewer questions than requested rather than looping forever.
    for (let attempt = 0; attempt < subjects.length * 2 && !picked; attempt++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      picked = SUBJECT_PICKERS[subject](excludeIds);
    }
    if (!picked) break;
    excludeIds.add(picked.id);
    // Free-text subjects (math, čeština, přírodověda, vlastivěda) have no
    // `options` at all — spreading `options: picked.options` would set the
    // field to `undefined` explicitly, and the Admin SDK throws on writing
    // an `undefined` value (masked to the client as a bare "internal"
    // error), so the `options` key must be omitted entirely rather than
    // set to undefined whenever the picked question doesn't have one.
    questions.push(
      picked.options
        ? { id: picked.id, question: picked.question, answer: picked.answer, options: picked.options }
        : { id: picked.id, question: picked.question, answer: picked.answer }
    );
  }
  return questions;
}

async function requireOpponentIsFamilyMember(db: Firestore, familyId: string, opponentId: string): Promise<void> {
  const snap = await db.collection("families").doc(familyId).collection("members").doc(opponentId).get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "Vyzvaný člen v rodině neexistuje.");
}

interface CreateRequest {
  familyId: string;
  opponentId: string;
  stake: number;
  questionCount: number;
}

export const createTriviaDuel = onCall<CreateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, opponentId, stake, questionCount } = request.data;
  if (!familyId || !opponentId || opponentId === uid) {
    throw new HttpsError("invalid-argument", "Neplatný požadavek na souboj.");
  }
  if (!validStake(stake)) {
    throw new HttpsError("invalid-argument", "Vklad musí být kladné celé číslo XP.");
  }
  if (!(QUESTION_COUNT_OPTIONS as readonly number[]).includes(questionCount)) {
    throw new HttpsError("invalid-argument", "Neplatný počet otázek.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  await requireOpponentIsFamilyMember(db, familyId, opponentId);

  const memberSnap = await db.collection("families").doc(familyId).collection("members").doc(uid).get();
  const member = memberSnap.data() as Member | undefined;
  if (!member || member.xpBalance < stake) {
    throw new HttpsError("failed-precondition", "Na tento vklad nemáš dost XP.");
  }

  const questions = buildQuestionSet(questionCount);
  if (questions.length === 0) {
    throw new HttpsError("failed-precondition", "Momentálně není z čeho sestavit otázky — zkus to později.");
  }

  const familyRef = db.collection("families").doc(familyId);
  const duelRef = familyRef.collection("triviaDuels").doc();

  const duel: Omit<TriviaDuel, "id"> = {
    challengerId: uid,
    challengerStake: stake,
    opponentId,
    status: "pending_acceptance",
    questionCount: questions.length,
    createdAt: Date.now(),
  };
  await duelRef.set(duel);

  const state: DuelState = {
    questions,
    challengerIndex: 0,
    challengerScore: 0,
    challengerDone: false,
    opponentIndex: 0,
    opponentScore: 0,
    opponentDone: false,
  };
  await familyRef.collection("triviaDuelState").doc(duelRef.id).set(state);

  return { duelId: duelRef.id };
});

interface RespondRequest {
  familyId: string;
  duelId: string;
  accept: boolean;
  stake?: number;
}

export const respondToTriviaDuel = onCall<RespondRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, duelId, accept, stake } = request.data;
  if (!familyId || !duelId) throw new HttpsError("invalid-argument", "familyId a duelId jsou povinné.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const duelRef = db.collection("families").doc(familyId).collection("triviaDuels").doc(duelId);
  const duelSnap = await duelRef.get();
  const duel = duelSnap.data() as TriviaDuel | undefined;
  if (!duel) throw new HttpsError("not-found", "Souboj nenalezen.");
  if (duel.opponentId !== uid) throw new HttpsError("permission-denied", "Tento souboj není určen tobě.");
  if (duel.status !== "pending_acceptance") {
    throw new HttpsError("failed-precondition", "Na tento souboj už bylo odpovězeno.");
  }

  if (!accept) {
    await duelRef.update({ status: "declined", respondedAt: Date.now() });
    return { status: "declined" };
  }

  if (!validStake(stake)) {
    throw new HttpsError("invalid-argument", "Vklad musí být kladné celé číslo XP.");
  }
  const memberSnap = await db.collection("families").doc(familyId).collection("members").doc(uid).get();
  const member = memberSnap.data() as Member | undefined;
  if (!member || member.xpBalance < stake!) {
    throw new HttpsError("failed-precondition", "Na tento vklad nemáš dost XP.");
  }

  await duelRef.update({ status: "in_progress", opponentStake: stake, respondedAt: Date.now() });
  return { status: "in_progress" };
});

interface CancelRequest {
  familyId: string;
  duelId: string;
}

export const cancelTriviaDuel = onCall<CancelRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, duelId } = request.data;
  if (!familyId || !duelId) throw new HttpsError("invalid-argument", "familyId a duelId jsou povinné.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const duelRef = db.collection("families").doc(familyId).collection("triviaDuels").doc(duelId);
  const duelSnap = await duelRef.get();
  const duel = duelSnap.data() as TriviaDuel | undefined;
  if (!duel) throw new HttpsError("not-found", "Souboj nenalezen.");
  if (duel.challengerId !== uid) throw new HttpsError("permission-denied", "Jen ten, kdo vyzval, může souboj zrušit.");
  if (duel.status !== "pending_acceptance") {
    throw new HttpsError("failed-precondition", "Tento souboj už nejde zrušit.");
  }

  await duelRef.update({ status: "cancelled", respondedAt: Date.now() });
  return { status: "cancelled" };
});

function roleFor(duel: TriviaDuel, uid: string): "challenger" | "opponent" {
  if (uid === duel.challengerId) return "challenger";
  if (uid === duel.opponentId) return "opponent";
  throw new HttpsError("permission-denied", "Nejsi účastníkem tohoto souboje.");
}

async function loadInProgressDuel(
  db: Firestore,
  familyId: string,
  duelId: string,
  uid: string
): Promise<{ duelRef: FirebaseFirestore.DocumentReference; duel: TriviaDuel; stateRef: FirebaseFirestore.DocumentReference; state: DuelState; role: "challenger" | "opponent" }> {
  const familyRef = db.collection("families").doc(familyId);
  const duelRef = familyRef.collection("triviaDuels").doc(duelId);
  const duelSnap = await duelRef.get();
  const duel = duelSnap.data() as TriviaDuel | undefined;
  if (!duel) throw new HttpsError("not-found", "Souboj nenalezen.");
  const role = roleFor(duel, uid);
  if (duel.status !== "in_progress") {
    throw new HttpsError("failed-precondition", "Tento souboj právě neprobíhá.");
  }

  const stateRef = familyRef.collection("triviaDuelState").doc(duelId);
  const stateSnap = await stateRef.get();
  const state = stateSnap.data() as DuelState | undefined;
  if (!state) throw new HttpsError("not-found", "Data souboje nenalezena.");

  return { duelRef, duel, stateRef, state, role };
}

interface QuestionRequest {
  familyId: string;
  duelId: string;
}

export const getTriviaDuelQuestion = onCall<QuestionRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, duelId } = request.data;
  if (!familyId || !duelId) throw new HttpsError("invalid-argument", "familyId a duelId jsou povinné.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const { state, role } = await loadInProgressDuel(db, familyId, duelId, uid);

  const index = role === "challenger" ? state.challengerIndex : state.opponentIndex;
  const done = role === "challenger" ? state.challengerDone : state.opponentDone;
  if (done || index >= state.questions.length) {
    return { complete: true };
  }

  const question = state.questions[index];
  return {
    complete: false,
    index,
    questionCount: state.questions.length,
    question: question.question,
    options: question.options,
  };
});

interface AnswerRequest {
  familyId: string;
  duelId: string;
  answer: string;
}

export const submitTriviaDuelAnswer = onCall<AnswerRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, duelId, answer } = request.data;
  if (!familyId || !duelId || typeof answer !== "string") {
    throw new HttpsError("invalid-argument", "familyId, duelId a answer jsou povinné.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const { duelRef, duel, stateRef, state, role } = await loadInProgressDuel(db, familyId, duelId, uid);

  const index = role === "challenger" ? state.challengerIndex : state.opponentIndex;
  const done = role === "challenger" ? state.challengerDone : state.opponentDone;
  if (done || index >= state.questions.length) {
    throw new HttpsError("failed-precondition", "Už jsi na všechny otázky odpověděl(a).");
  }

  const current = state.questions[index];
  const correct = isAnswerCorrect(answer, current.answer);
  const nextIndex = index + 1;
  const nextDone = nextIndex >= state.questions.length;

  const update: Partial<DuelState> =
    role === "challenger"
      ? {
          challengerIndex: nextIndex,
          challengerScore: state.challengerScore + (correct ? 1 : 0),
          challengerDone: nextDone,
        }
      : {
          opponentIndex: nextIndex,
          opponentScore: state.opponentScore + (correct ? 1 : 0),
          opponentDone: nextDone,
        };
  await stateRef.update(update);

  const challengerDone = role === "challenger" ? nextDone : state.challengerDone;
  const opponentDone = role === "opponent" ? nextDone : state.opponentDone;
  const challengerScore = role === "challenger" ? state.challengerScore + (correct ? 1 : 0) : state.challengerScore;
  const opponentScore = role === "opponent" ? state.opponentScore + (correct ? 1 : 0) : state.opponentScore;

  if (!challengerDone || !opponentDone) {
    return { correct, correctAnswer: primaryAnswer(current.answer), done: nextDone };
  }

  // Both sides have now answered every question — settle the duel.
  const winner = determineDuelWinner(challengerScore, opponentScore, duel.challengerId, duel.opponentId);
  const transfer = settlementTransfer(winner, duel.challengerId, duel.challengerStake, duel.opponentId, duel.opponentStake ?? 0);

  if (transfer) {
    const familyRef = db.collection("families").doc(familyId);
    const fromRef = familyRef.collection("members").doc(transfer.fromUserId);
    const toRef = familyRef.collection("members").doc(transfer.toUserId);
    await db.runTransaction(async (tx) => {
      // Firestore transactions require every read before any write, so
      // both member docs are fetched up front.
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
      const fromMember = fromSnap.data() as Member | undefined;
      const toMember = toSnap.data() as Member | undefined;
      // The loser may have spent their pledged XP elsewhere in the
      // meantime (no escrow was taken at challenge/accept time — see the
      // file header). If they can no longer cover it, the duel still
      // completes and shows a winner, it just settles for whatever they
      // can actually afford rather than failing outright.
      const amount = Math.min(transfer.amount, Math.max(0, fromMember?.xpBalance ?? 0));
      if (amount > 0) {
        tx.update(fromRef, { xpBalance: (fromMember?.xpBalance ?? 0) - amount });
        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({ userId: transfer.fromUserId, delta: -amount, reason: "trivia_duel_lost", relatedTaskId: duelId })
        );
        tx.update(toRef, { xpBalance: (toMember?.xpBalance ?? 0) + amount });
        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({ userId: transfer.toUserId, delta: amount, reason: "trivia_duel_won", relatedTaskId: duelId })
        );
      }
    });
  }

  await duelRef.update({
    status: "completed",
    challengerScore,
    opponentScore,
    winnerId: winner,
    completedAt: Date.now(),
  });

  return { correct, correctAnswer: primaryAnswer(current.answer), done: true, challengerScore, opponentScore, winnerId: winner };
});
