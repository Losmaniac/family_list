/**
 * Angličtina — flashcards. Show a member 10 random word/emoji cards to
 * study, then quiz them on the same 10 (emoji only, they type the English
 * word), 1 XP per correct guess. The card set and correct answers live
 * server-side in `practicePendingEnglish/{uid}` (no client-facing rule,
 * same pattern as practicePending) — the client only ever gets the parts
 * safe to show at each phase.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { ENGLISH_WORDS } from "../../lib/english-words";
import { PRACTICE_XP_PER_PROBLEM, isAnswerCorrect } from "../../lib/practice";
import { requireAuth, requireFamilyMember, awardCappedPracticeXp } from "./practice";

const FLASHCARD_COUNT = 10;

function pickRandomWords(count: number): { en: string; emoji: string; category: string }[] {
  const pool = [...ENGLISH_WORDS];
  const picked: { en: string; emoji: string; category: string }[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const [word] = pool.splice(index, 1);
    picked.push({ en: word.en, emoji: word.emoji, category: word.category });
  }
  return picked;
}

interface GenerateRequest {
  familyId: string;
}

export const generateEnglishFlashcards = onCall<GenerateRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId } = request.data;
  if (!familyId) throw new HttpsError("invalid-argument", "familyId is required.");
  await requireFamilyMember(familyId, uid);

  const cards = pickRandomWords(FLASHCARD_COUNT);
  const db = getFirestore();
  await db
    .collection("families")
    .doc(familyId)
    .collection("practicePendingEnglish")
    .doc(uid)
    .set({ cards, index: 0, correctCount: 0, createdAt: Date.now() });

  return { cards };
});

interface SubmitRequest {
  familyId: string;
  answer: string;
}

export const submitEnglishFlashcardAnswer = onCall<SubmitRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const { familyId, answer } = request.data;
  if (!familyId || typeof answer !== "string") {
    throw new HttpsError("invalid-argument", "familyId and answer are required.");
  }
  await requireFamilyMember(familyId, uid);

  const db = getFirestore();
  const familyRef = db.collection("families").doc(familyId);
  const pendingRef = familyRef.collection("practicePendingEnglish").doc(uid);
  const pendingSnap = await pendingRef.get();
  const pending = pendingSnap.data();
  if (!pending) {
    throw new HttpsError("failed-precondition", "Žádný test nečeká — vyžádej si nové kartičky.");
  }

  const cards = pending.cards as { en: string; emoji: string; category: string }[];
  const index = pending.index as number;
  const current = cards[index];
  const correct = isAnswerCorrect(answer, current.en);
  const correctCount = (pending.correctCount as number) + (correct ? 1 : 0);
  const nextIndex = index + 1;
  const done = nextIndex >= cards.length;

  if (!done) {
    await pendingRef.update({ index: nextIndex, correctCount });
    return { correct, correctAnswer: current.en, done: false, correctCount };
  }

  await pendingRef.delete();
  const reward = correctCount * PRACTICE_XP_PER_PROBLEM;
  const awarded = await awardCappedPracticeXp(db, familyRef, uid, reward);

  return { correct, correctAnswer: current.en, done: true, correctCount, totalAwarded: awarded };
});
