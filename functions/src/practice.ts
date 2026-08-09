/**
 * "Vzdělání" practice module — word/logic problems (Matematika) and
 * language exercises (Čeština) for a small XP reward, capped per day. The
 * problem (and its answer) only ever lives server-side in
 * `practicePending/{uid}` — a path with no client-facing Firestore rule at
 * all, so it's unreachable from the client by default — the client only
 * ever sees the question text via these callables' responses. XP is
 * awarded here the same trusted way as everywhere else in the app: an
 * xpLedger entry + xpBalance increment, never a raw client write.
 *
 * Angličtina (flashcards) is a different enough interaction shape — a
 * batch of 10 shown, then quizzed — that it lives in its own file,
 * englishFlashcards.ts; awardCappedPracticeXp below is shared by both so
 * the one daily cap (family.practiceDailyXpCap) applies across every
 * Vzdělání subject, not per-subject.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import {
  DEFAULT_PRACTICE_DAILY_XP_CAP,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_XP_PER_PROBLEM,
  isAnswerCorrect,
  pickRandomLogicWordProblem,
} from "../../lib/practice";
import { pickRandomCzechExercise } from "../../lib/czech-language";
import { pickRandomPrirodovedaExercise } from "../../lib/prirodoveda";
import { pickRandomVlastivedaExercise } from "../../lib/vlastiveda";
import { pickRandomAtlasQuestion } from "./atlas";
import { dateKeyInFamilyZone } from "../../lib/date-utils";
import { buildLedgerEntry } from "../../lib/xp-engine";
import type { Family, XpLedgerEntry } from "../../lib/types";

export function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
}

export async function requireFamilyMember(familyId: string, uid: string): Promise<void> {
  const db = getFirestore();
  const memberSnap = await db.collection("families").doc(familyId).collection("members").doc(uid).get();
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "Not a member of this family.");
}

/**
 * Awards up to `reward` XP under the family's shared Vzdělání daily cap —
 * used by every subject (Matematika/Čeština here, Angličtina in
 * englishFlashcards.ts) so the cap is enforced across the whole module,
 * not reset per subject. Returns how much was actually awarded (0 if the
 * cap was already hit).
 */
export async function awardCappedPracticeXp(
  db: Firestore,
  familyRef: DocumentReference,
  uid: string,
  reward: number
): Promise<number> {
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

  const headroom = Math.max(0, dailyCap - earnedToday);
  const awarded = Math.min(reward, headroom);
  if (awarded <= 0) return 0;

  const memberRef = familyRef.collection("members").doc(uid);
  await db.runTransaction(async (tx) => {
    tx.set(
      familyRef.collection("xpLedger").doc(),
      buildLedgerEntry({ userId: uid, delta: awarded, reason: "practice_correct" })
    );
    tx.update(memberRef, { xpBalance: FieldValue.increment(awarded) });
  });

  return awarded;
}

interface GenerateRequest {
  familyId: string;
  subject: "math" | "czech" | "prirodoveda" | "vlastiveda" | "atlas";
}

type SyncSubject = Exclude<GenerateRequest["subject"], "atlas">;

const SUBJECT_PICKERS: Record<
  SyncSubject,
  (excludeIds: Set<string>) => { id: string; question: string; answer: string } | undefined
> = {
  math: (excludeIds) => pickRandomLogicWordProblem(undefined, Math.random, excludeIds),
  czech: (excludeIds) => pickRandomCzechExercise(Math.random, excludeIds),
  prirodoveda: (excludeIds) => pickRandomPrirodovedaExercise(Math.random, excludeIds),
  vlastiveda: (excludeIds) => pickRandomVlastivedaExercise(Math.random, excludeIds),
};

export const generatePracticeProblem = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, subject } = request.data;
  if (!familyId || !(subject === "atlas" || SUBJECT_PICKERS[subject])) {
    throw new HttpsError("invalid-argument", "familyId and a valid subject are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const progressSnap = await familyRef.collection("practiceProgress").doc(uid).get();
  const excludeIds = new Set<string>((progressSnap.data()?.[subject] as string[] | undefined) ?? []);

  const problem = subject === "atlas" ? await pickRandomAtlasQuestion(excludeIds) : SUBJECT_PICKERS[subject](excludeIds);
  if (!problem) {
    // Every exercise in this subject's finite bank has already been
    // answered correctly — nothing left to ask.
    return { subject, complete: true };
  }

  await familyRef.collection("practicePending").doc(uid).set({
    subject,
    problemId: problem.id,
    correctAnswer: problem.answer,
    attempts: 0,
    createdAt: Date.now(),
  });
  return { question: problem.question, subject, complete: false };
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

  await pendingRef.delete();
  const problemId = pending.problemId as string | undefined;
  const subject = pending.subject as string;
  if (problemId) {
    await familyRef
      .collection("practiceProgress")
      .doc(uid)
      .set({ [subject]: FieldValue.arrayUnion(problemId) }, { merge: true });
  }
  const awarded = await awardCappedPracticeXp(db, familyRef, uid, PRACTICE_XP_PER_PROBLEM);

  return { correct: true, awarded, capReached: awarded < PRACTICE_XP_PER_PROBLEM };
});
