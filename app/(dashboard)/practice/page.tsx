"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Sparkles } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { PRACTICE_SUBJECT_TOTALS, PRACTICE_SUBJECTS, PRACTICE_XP_PER_PROBLEM } from "@/lib/practice";
import { formatXp } from "@/lib/xp-engine";
import EnglishFlashcards from "@/components/EnglishFlashcards";
import PracticeOverviewPanel from "@/components/PracticeOverviewPanel";
import AtlasCountryList from "@/components/AtlasCountryList";
import FoodFactsExplorer from "@/components/FoodFactsExplorer";
import EncyclopediaExplorer from "@/components/EncyclopediaExplorer";
import type { PracticeProgress } from "@/lib/types";

type Subject = "math" | "czech" | "prirodoveda" | "vlastiveda" | "atlas";
const GENERATE_SUBJECTS: Subject[] = ["math", "czech", "prirodoveda", "vlastiveda", "atlas"];

interface GenerateResponse {
  question?: string;
  subject: Subject;
  complete: boolean;
}

interface SubmitResponse {
  correct: boolean;
  awarded: number;
  attemptsLeft?: number;
  correctAnswer?: string;
  capReached?: boolean;
}

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

export default function PracticePage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();

  const [subject, setSubject] = useState<string>("math");
  const [current, setCurrent] = useState<GenerateResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<PracticeProgress | null>(null);

  useEffect(() => {
    if (!familyId || !user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "practiceProgress", user.uid), (snap) => {
      setProgress(snap.exists() ? ({ id: snap.id, ...snap.data() } as PracticeProgress) : null);
    });
  }, [familyId, user]);

  async function handleNewProblem() {
    if (!familyId || !GENERATE_SUBJECTS.includes(subject as Subject)) return;
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    try {
      const result = await httpsCallable<{ familyId: string; subject: Subject }, GenerateResponse>(
        getFirebaseFunctions(),
        "generatePracticeProblem"
      )({ familyId, subject: subject as Subject });
      setCurrent(result.data);
    } catch (err) {
      toast.error(describeError(err, "Úlohu se nepodařilo připravit."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !answer.trim() || !current) return;
    setSubmitting(true);
    try {
      const result = await httpsCallable<{ familyId: string; answer: string }, SubmitResponse>(
        getFirebaseFunctions(),
        "submitPracticeAnswer"
      )({ familyId, answer: answer.trim() });
      const data = result.data;
      if (data.correct) {
        setCurrent(null);
        setAnswer("");
        if (data.awarded > 0) {
          toast.success(`Správně! +${formatXp(data.awarded)} XP`);
        } else {
          setFeedback("Správně! Dnešní limit XP z Vzdělání je ale už vyčerpaný.");
        }
      } else if (data.attemptsLeft && data.attemptsLeft > 0) {
        setFeedback(`Není to ono, zkus to znovu — zbývá ${data.attemptsLeft} ${data.attemptsLeft === 1 ? "pokus" : "pokusy"}.`);
        setAnswer("");
      } else {
        setFeedback(`Správná odpověď byla: ${data.correctAnswer}. Zkus další úlohu.`);
        setCurrent(null);
        setAnswer("");
      }
    } catch (err) {
      toast.error(describeError(err, "Odpověď se nepodařilo odeslat."));
    } finally {
      setSubmitting(false);
    }
  }

  function selectSubject(next: string) {
    setSubject(next);
    setCurrent(null);
    setAnswer("");
    setFeedback(null);
  }

  const subjectDone = progress?.[subject as Subject]?.length ?? 0;
  const subjectTotal = PRACTICE_SUBJECT_TOTALS[subject] ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Vzdělání</h1>
      <p className="text-sm text-zinc-500">
        {subject === "english"
          ? "Nauč se anglická slovíčka pomocí kartiček a získej +1 XP za každé uhodnuté."
          : subject === "food" || subject === "wiki"
            ? "Bez XP — jen k nahlédnutí a hledání."
            : `Vyřeš úlohu a získej +${formatXp(PRACTICE_XP_PER_PROBLEM)} XP. Za den je limit, kolik XP takhle můžeš nasbírat. Jednou zodpovězenou otázku už znovu nedostaneš.`}
      </p>

      <div className="flex flex-wrap gap-2">
        {PRACTICE_SUBJECTS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={!s.available}
            onClick={() => selectSubject(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
              subject === s.id ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            {s.label}
            {!s.available && " (připravujeme)"}
          </button>
        ))}
      </div>

      {subjectTotal > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-zinc-500">
            Zvládnuto {subjectDone}/{subjectTotal}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, Math.round((subjectDone / subjectTotal) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {subject === "english" && <EnglishFlashcards />}
      {subject === "food" && <FoodFactsExplorer />}
      {subject === "wiki" && <EncyclopediaExplorer />}
      {subject === "atlas" && <AtlasCountryList />}

      {GENERATE_SUBJECTS.includes(subject as Subject) && (
        <>
          {!current ? (
            <button
              type="button"
              onClick={handleNewProblem}
              disabled={loading}
              className="flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <Sparkles size={16} /> {loading ? "Připravuji…" : "Nová úloha"}
            </button>
          ) : current.complete ? (
            <p className="text-sm text-zinc-500">
              🎉 Všechny úlohy z tohoto předmětu už máš zvládnuté — víc jich zatím není.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <p className="text-lg font-medium">{current.question}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Tvoje odpověď"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
                />
                <button
                  type="submit"
                  disabled={submitting || !answer.trim()}
                  className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  Odeslat
                </button>
              </div>
            </form>
          )}

          {feedback && <p className="text-sm text-zinc-500">{feedback}</p>}
        </>
      )}

      {member?.role === "parent" && familyId && <PracticeOverviewPanel familyId={familyId} />}
    </div>
  );
}
