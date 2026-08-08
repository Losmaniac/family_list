/**
 * "Příklady" practice module — math/logic/word problems for a small XP
 * reward, capped per day. The problem (and its answer) only ever lives
 * server-side in `practicePending/{uid}` — a path with no client-facing
 * Firestore rule at all, so it's unreachable from the client by default —
 * the client only ever sees the question text via these callables'
 * responses. XP is awarded here the same trusted way as everywhere else in
 * the app: an xpLedger entry + xpBalance increment, never a raw client write.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  DEFAULT_PRACTICE_DAILY_XP_CAP,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_XP_PER_PROBLEM,
  generateMathProblem,
  isAnswerCorrect,
  pickGradeAppropriateMathDifficulty,
  pickRandomLogicWordProblem,
} from "../../lib/practice";
import { dateKeyInFamilyZone } from "../../lib/date-utils";
import { buildLedgerEntry } from "../../lib/xp-engine";
import type { Family, XpLedgerEntry } from "../../lib/types";

function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
}

async function requireFamilyMember(familyId: string, uid: string): Promise<void> {
  const db = getFirestore();
  const memberSnap = await db.collection("families").doc(familyId).collection("members").doc(uid).get();
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "Not a member of this family.");
}

interface GenerateRequest {
  familyId: string;
  type: "math" | "logicword";
}

// No difficulty picker in the UI — the server always chooses, tuned for
// 5th grade. Any difficulty a client might still send is ignored; it was
// never trust-relevant anyway now that every problem pays the same flat
// PRACTICE_XP_PER_PROBLEM regardless of difficulty.
export const generatePracticeProblem = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, type } = request.data;
  if (!familyId || (type !== "math" && type !== "logicword")) {
    throw new HttpsError("invalid-argument", "familyId and a valid type are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const pendingRef = db.collection("families").doc(familyId).collection("practicePending").doc(uid);

  if (type === "math") {
    const difficulty = pickGradeAppropriateMathDifficulty();
    const problem = generateMathProblem(difficulty);
    await pendingRef.set({
      type,
      correctAnswer: String(problem.correctAnswer),
      attempts: 0,
      createdAt: Date.now(),
    });
    return { question: problem.question, type };
  }

  const problem = pickRandomLogicWordProblem();
  await pendingRef.set({
    type,
    correctAnswer: problem.answer,
    attempts: 0,
    createdAt: Date.now(),
  });
  return { question: problem.question, type };
});

interface SubmitRequest {
  familyId: string;
  answer: string;
}

export const submitPracticeAnswer = onCall<SubmitRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, answer } = request.data;
  if (!familyId || typeof answer !== "string") {
    throw new HttpsError("invalid-argument", "familyId and answer are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const pendingRef = familyRef.collection("practicePending").doc(uid);
  const pendingSnap = await pendingRef.get();
  const pending = pendingSnap.data();
  if (!pending) {
    throw new HttpsError("failed-precondition", "Žádná úloha nečeká na odpověď — vyžádej si novou.");
  }

  const correct = isAnswerCorrect(answer, pending.correctAnswer as string);

  if (!correct) {
    const attempts = ((pending.attempts as number) ?? 0) + 1;
    if (attempts >= PRACTICE_MAX_ATTEMPTS) {
      await pendingRef.delete();
      return { correct: false, attemptsLeft: 0, correctAnswer: pending.correctAnswer as string, awarded: 0 };
    }
    await pendingRef.update({ attempts });
    return { correct: false, attemptsLeft: PRACTICE_MAX_ATTEMPTS - attempts, awarded: 0 };
  }

  const familySnap = await familyRef.get();
  const family = familySnap.data() as Family | undefined;
  const dailyCap = family?.practiceDailyXpCap ?? DEFAULT_PRACTICE_DAILY_XP_CAP;

  const today = dateKeyInFamilyZone(new Date());
  const recentSnap = await familyRef
    .collection("xpLedger")
    .where("userId", "==", uid)
    .where("reason", "==", "practice_correct")
    .orderBy("timestamp", "desc")
    .limit(200)
    .get();
  const earnedToday = recentSnap.docs
    .map((d) => d.data() as XpLedgerEntry)
    .filter((e) => dateKeyInFamilyZone(new Date(e.timestamp)) === today)
    .reduce((sum, e) => sum + e.delta, 0);

  const reward = PRACTICE_XP_PER_PROBLEM;
  const headroom = Math.max(0, dailyCap - earnedToday);
  const awarded = Math.min(reward, headroom);

  await pendingRef.delete();

  if (awarded <= 0) {
    return { correct: true, awarded: 0, capReached: true };
  }

  const memberRef = familyRef.collection("members").doc(uid);
  await db.runTransaction(async (tx) => {
    tx.set(
      familyRef.collection("xpLedger").doc(),
      buildLedgerEntry({ userId: uid, delta: awarded, reason: "practice_correct" })
    );
    tx.update(memberRef, { xpBalance: FieldValue.increment(awarded) });
  });

  return { correct: true, awarded, capReached: awarded < reward };
});
