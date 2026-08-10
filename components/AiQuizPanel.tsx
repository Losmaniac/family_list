"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Sparkles } from "lucide-react";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import { AI_QUIZ_TOPICS, type AiQuizTopic } from "@/lib/ai-quiz";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

interface CurrentQuestion {
  question: string;
  options: [string, string, string];
}

/**
 * "AI otázky" — pick a topic, Gemini generates a fresh multiple-choice
 * question on the spot (functions/src/aiQuiz.ts; the API key never
 * reaches this client). No fixed bank, so questions never run out and
 * never repeat in a trackable way, unlike every other Vzdělání subject.
 */
export default function AiQuizPanel() {
  const { familyId, family } = useFamily();
  const toast = useToast();

  const [topic, setTopic] = useState<AiQuizTopic | null>(null);
  const [current, setCurrent] = useState<CurrentQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [capReached, setCapReached] = useState(false);

  const configured = family?.geminiApiKeyConfigured === true;

  async function handleNewQuestion(selectedTopic: AiQuizTopic) {
    if (!familyId) return;
    setTopic(selectedTopic);
    setLoading(true);
    setFeedback(null);
    setCurrent(null);
    try {
      const result = await httpsCallable<
        { familyId: string; topicId: string },
        { question: string | null; options: [string, string, string] | null; capReached: boolean }
      >(
        getFirebaseFunctions(),
        "generateAiQuizQuestion"
      )({ familyId, topicId: selectedTopic.id });
      if (result.data.capReached || !result.data.question || !result.data.options) {
        setCapReached(true);
        return;
      }
      setCurrent({ question: result.data.question, options: result.data.options });
    } catch (err) {
      toast.error(describeError(err, "Otázku se nepodařilo vygenerovat."));
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(option: string) {
    if (!familyId || !current) return;
    setSubmitting(true);
    try {
      const result = await httpsCallable<
        { familyId: string; answer: string },
        { correct: boolean; correctAnswer: string; awarded: number; capReached?: boolean }
      >(
        getFirebaseFunctions(),
        "submitAiQuizAnswer"
      )({ familyId, answer: option });
      if (result.data.correct) {
        toast.success(result.data.awarded > 0 ? `Správně! +${formatXp(result.data.awarded)} XP` : "Správně!");
      } else {
        setFeedback(`Bylo to: ${result.data.correctAnswer}`);
      }
      setCurrent(null);
      if (result.data.capReached) setCapReached(true);
    } catch (err) {
      toast.error(describeError(err, "Odpověď se nepodařilo odeslat."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
        <Sparkles size={40} />
        <p className="text-lg">Tahle sekce ještě čeká na API klíč.</p>
        <p className="max-w-xs text-sm">Rodič ho může zadat v Nastavení → AI otázky (zdarma z Google AI Studio).</p>
      </div>
    );
  }

  if (capReached) {
    return <p className="text-sm text-zinc-500">🌙 Dnešní limit XP z Vzdělání je vyčerpaný — zkus to znovu zítra.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {AI_QUIZ_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleNewQuestion(t)}
            disabled={loading}
            className={`rounded-full px-3 py-1.5 text-sm disabled:opacity-50 ${
              topic?.id === t.id ? "bg-accent text-accent-foreground" : "border border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <div className="h-6 w-3/4 animate-pulse rounded bg-surface-muted" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      ) : current ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <p className="text-lg font-medium">{current.question}</p>
          <div className="flex flex-col gap-2">
            {current.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={submitting}
                className="rounded-lg border border-border px-4 py-2.5 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-zinc-500">
          <Sparkles size={40} />
          <p className="text-lg">{feedback ?? "Vyber si téma výš a AI ti připraví otázku."}</p>
        </div>
      )}
    </div>
  );
}
