/**
 * Španělština — flashcards. Same mechanic as englishFlashcards.ts: 10
 * random word/emoji cards to study, then a quiz on the same 10 (emoji
 * only, type the Spanish word), 1 XP per correct guess. Kept as a
 * separate file/collection (practicePendingSpanish, progress key
 * "spanish") rather than parameterizing englishFlashcards.ts — matches
 * this codebase's existing per-subject-file convention over cross-subject
 * generalization.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SPANISH_WORDS } from "../../lib/spanish-words";
import { PRACTICE_XP_PER_PROBLEM, isAnswerCorrect } from "../../lib/practice";
import { requireAuth, requireFamilyMember, awardCappedPracticeXp } from "./practice";

const FLASHCARD_COUNT = 10;

type FlashcardEntry = { id: string; es: string; emoji: string; category: string };

function pickRandomWords(count: number, excludeIds: Set<string>): FlashcardEntry[] {
  const pool = SPANISH_WORDS.filter((w) => !excludeIds.has(w.id));
  const picked: FlashcardEntry[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const [word] = pool.splice(index, 1);
    picked.push({ id: word.id, es: word.es, emoji: word.emoji, category: word.category });
  }
  return picked;
}

interface GenerateRequest {
  familyId: string;
}

export const generateSpanishFlashcards = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId } = request.data;
  if (!familyId) throw new HttpsError("invalid-argument", "familyId is required.");
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);

  const progressSnap = await familyRef.collection("practiceProgress").doc(uid).get();
  const excludeIds = new Set<string>((progressSnap.data()?.spanish as string[] | undefined) ?? []);

  const cards = pickRandomWords(FLASHCARD_COUNT, excludeIds);
  if (cards.length === 0) {
    return { cards: [], complete: true };
  }

  await familyRef
    .collection("practicePendingSpanish")
    .doc(uid)
    .set({ cards, index: 0, correctCount: 0, createdAt: Date.now() });

  return { cards, complete: false };
});

interface SubmitRequest {
  familyId: string;
  answer: string;
}

export const submitSpanishFlashcardAnswer = onCall<SubmitRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, answer } = request.data;
  if (!familyId || typeof answer !== "string") {
    throw new HttpsError("invalid-argument", "familyId and answer are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const pendingRef = familyRef.collection("practicePendingSpanish").doc(uid);
  const pendingSnap = await pendingRef.get();
  const pending = pendingSnap.data();
  if (!pending) {
    throw new HttpsError("failed-precondition", "Žádný test nečeká — vyžádej si nové kartičky.");
  }

  const cards = pending.cards as FlashcardEntry[];
  const index = pending.index as number;
  const current = cards[index];
  const correct = isAnswerCorrect(answer, current.es);
  const correctCount = (pending.correctCount as number) + (correct ? 1 : 0);
  const nextIndex = index + 1;
  const done = nextIndex >= cards.length;

  if (correct) {
    await familyRef
      .collection("practiceProgress")
      .doc(uid)
      .set({ spanish: FieldValue.arrayUnion(current.id) }, { merge: true });
  }

  if (!done) {
    await pendingRef.update({ index: nextIndex, correctCount });
    return { correct, correctAnswer: current.es, done: false, correctCount };
  }

  await pendingRef.delete();
  const reward = correctCount * PRACTICE_XP_PER_PROBLEM;
  const awarded = await awardCappedPracticeXp(db, familyRef, uid, reward);

  return { correct, correctAnswer: current.es, done: true, correctCount, totalAwarded: awarded };
});
