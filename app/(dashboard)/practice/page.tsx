"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Brain, Calculator, Sparkles } from "lucide-react";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { PRACTICE_SUBJECTS, PRACTICE_XP_PER_PROBLEM } from "@/lib/practice";

type ProblemType = "math" | "logicword";

interface GenerateResponse {
  question: string;
  type: ProblemType;
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
  const { familyId } = useFamily();
  const toast = useToast();

  const [subject, setSubject] = useState("math");
  const [type, setType] = useState<ProblemType>("math");
  const [current, setCurrent] = useState<GenerateResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleNewProblem() {
    if (!familyId) return;
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    try {
      const result = await httpsCallable<{ familyId: string; type: ProblemType }, GenerateResponse>(
        getFirebaseFunctions(),
        "generatePracticeProblem"
      )({ familyId, type });
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
          toast.success(`Správně! +${data.awarded} XP`);
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Vzdělání</h1>
      <p className="text-sm text-zinc-500">
        Vyřeš úlohu a získej +{PRACTICE_XP_PER_PROBLEM} XP. Za den je limit, kolik XP takhle můžeš nasbírat.
      </p>

      <div className="flex flex-wrap gap-2">
        {PRACTICE_SUBJECTS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={!s.available}
            onClick={() => setSubject(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
              subject === s.id ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            {s.label}
            {!s.available && " (připravujeme)"}
          </button>
        ))}
      </div>

      {subject === "math" && (
        <>
          <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
            <button
              type="button"
              onClick={() => setType("math")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                type === "math" ? "bg-accent text-accent-foreground" : "text-zinc-500"
              }`}
            >
              <Calculator size={14} /> Počítání
            </button>
            <button
              type="button"
              onClick={() => setType("logicword")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                type === "logicword" ? "bg-accent text-accent-foreground" : "text-zinc-500"
              }`}
            >
              <Brain size={14} /> Logika a slovní úlohy
            </button>
          </div>

          {!current ? (
            <button
              type="button"
              onClick={handleNewProblem}
              disabled={loading}
              className="flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              <Sparkles size={16} /> {loading ? "Připravuji…" : "Nová úloha"}
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <p className="text-lg font-medium">{current.question}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode={current.type === "math" ? "numeric" : "text"}
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
    </div>
  );
}
