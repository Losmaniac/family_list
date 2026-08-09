"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { ChevronRight, Sparkles } from "lucide-react";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import { buildExampleSentence } from "@/lib/english-words";

interface FlashcardEntry {
  en: string;
  emoji: string;
  category: string;
}

interface GenerateResponse {
  cards: FlashcardEntry[];
}

interface SubmitResponse {
  correct: boolean;
  correctAnswer: string;
  done: boolean;
  correctCount: number;
  totalAwarded?: number;
}

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

type Phase = "idle" | "study" | "quiz" | "result";

/**
 * Angličtina — 10 random word/emoji flashcards shown to study (picture +
 * English word, no translation — the picture carries the meaning), then
 * the same 10 quizzed back (emoji only, type the English word), 1 XP per
 * correct guess. The card set and answers live server-side
 * (practicePendingEnglish/{uid}); this component just walks through the
 * two phases and reports what generatePracticeProblem's sibling callables
 * return at each step.
 */
export default function EnglishFlashcards() {
  const { familyId } = useFamily();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [cards, setCards] = useState<FlashcardEntry[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAwarded, setTotalAwarded] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleStart() {
    if (!familyId) return;
    setLoading(true);
    try {
      const result = await httpsCallable<{ familyId: string }, GenerateResponse>(
        getFirebaseFunctions(),
        "generateEnglishFlashcards"
      )({ familyId });
      setCards(result.data.cards);
      setStudyIndex(0);
      setQuizIndex(0);
      setCorrectCount(0);
      setTotalAwarded(0);
      setFeedback(null);
      setAnswer("");
      setPhase("study");
    } catch (err) {
      toast.error(describeError(err, "Kartičky se nepodařilo připravit."));
    } finally {
      setLoading(false);
    }
  }

  function handleNextStudyCard() {
    if (studyIndex + 1 >= cards.length) {
      setPhase("quiz");
      return;
    }
    setStudyIndex((i) => i + 1);
  }

  async function handleSubmitGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !answer.trim()) return;
    setSubmitting(true);
    try {
      const result = await httpsCallable<{ familyId: string; answer: string }, SubmitResponse>(
        getFirebaseFunctions(),
        "submitEnglishFlashcardAnswer"
      )({ familyId, answer: answer.trim() });
      const data = result.data;
      setCorrectCount(data.correctCount);
      setFeedback(data.correct ? "Správně!" : `Bylo to: ${data.correctAnswer}`);
      setAnswer("");
      if (data.done) {
        setTotalAwarded(data.totalAwarded ?? 0);
        setPhase("result");
      } else {
        setQuizIndex((i) => i + 1);
      }
    } catch (err) {
      toast.error(describeError(err, "Odpověď se nepodařilo odeslat."));
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        <Sparkles size={16} /> {loading ? "Připravuji…" : "Zobrazit 10 kartiček"}
      </button>
    );
  }

  if (phase === "study") {
    const card = cards[studyIndex];
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-6">
        <p className="text-sm text-zinc-500">
          Kartička {studyIndex + 1} / {cards.length}
        </p>
        <p className="text-7xl">{card.emoji}</p>
        <p className="text-2xl font-semibold">{card.en}</p>
        <p className="text-center text-sm italic text-zinc-500">{buildExampleSentence(card)}</p>
        <button
          type="button"
          onClick={handleNextStudyCard}
          className="flex items-center gap-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          {studyIndex + 1 >= cards.length ? "Začít test" : "Další kartička"} <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  if (phase === "quiz") {
    const card = cards[quizIndex];
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-6">
        <p className="text-sm text-zinc-500">
          Otázka {quizIndex + 1} / {cards.length} · {correctCount} správně
        </p>
        <p className="text-7xl">{card.emoji}</p>
        <form onSubmit={handleSubmitGuess} className="flex w-full max-w-xs gap-2">
          <input
            type="text"
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Anglicky…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Odeslat
          </button>
        </form>
        {feedback && <p className="text-sm text-zinc-500">{feedback}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center">
      <p className="text-lg font-semibold">
        Uhodl(a) jsi {correctCount} z {cards.length}!
      </p>
      <p className="text-sm text-zinc-500">
        {totalAwarded > 0
          ? `Získáváš +${formatXp(totalAwarded)} XP.`
          : "Dnešní limit XP z Vzdělání je ale už vyčerpaný."}
      </p>
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        <Sparkles size={16} /> {loading ? "Připravuji…" : "Dalších 10 kartiček"}
      </button>
    </div>
  );
}
