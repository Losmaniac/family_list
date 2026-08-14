"use client";

import { useEffect, useRef, useState } from "react";
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
import WorldBankExplorer from "@/components/WorldBankExplorer";
import ChessGame from "@/components/ChessGame";
import GamesArcade from "@/components/GamesArcade";
import TriviaDuelPanel from "@/components/TriviaDuelPanel";
import SpanishFlashcards from "@/components/SpanishFlashcards";
import AiQuizPanel from "@/components/AiQuizPanel";
import AiTutorPanel from "@/components/AiTutorPanel";
import type { PracticeProgress } from "@/lib/types";

type Subject = "math" | "czech" | "prirodoveda" | "vlastiveda" | "finance" | "ai" | "digisafety" | "dictionary" | "atlas";
const GENERATE_SUBJECTS: Subject[] = [
  "math",
  "czech",
  "prirodoveda",
  "vlastiveda",
  "finance",
  "ai",
  "digisafety",
  "dictionary",
  "atlas",
];

// Brief pauses before auto-advancing to the next question — long enough to
// read the success toast / the revealed correct answer, short enough that
// it still feels like "next question", not a stall. Doesn't apply to a
// question with an explanation (see revealedExplanation below) — those
// wait for a manual "Další úloha" click instead, since the whole point is
// to actually read the explanation, not have it flash by.
const AUTO_ADVANCE_CORRECT_DELAY_MS = 900;
const AUTO_ADVANCE_REVEAL_DELAY_MS = 2200;

interface GenerateResponse {
  question?: string;
  subject: Subject;
  complete: boolean;
  capReached?: boolean;
  options?: [string, string, string];
  explanation?: string;
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

// Matches every Čeština "fill in the blank" question ("Dopln y/i: b_t (…)",
// "Dopln i/y: Chlapci běžel_ na hřiště.") — see lib/czech-language.ts. These
// are the only Čeština exercises where the answer is always a single letter,
// so a tap-to-answer button row can replace typing.
const IY_FILL_IN_PATTERN = /^Dopln [iyíý]\/[iyíý]:/i;
const IY_LETTER_OPTIONS = ["i", "y", "í", "ý"];

export default function PracticePage() {
  const { user } = useAuth();
  const { familyId, member, family } = useFamily();
  const toast = useToast();

  const [subject, setSubject] = useState<string>("math");
  const [current, setCurrent] = useState<GenerateResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<PracticeProgress | null>(null);
  // The daily cap is shared across every Vzdělání subject (see
  // getPracticeXpHeadroomToday), so once it's hit it stays hit regardless
  // of which subject tab is selected — never cleared back to false client-
  // side, only a fresh day (i.e. a fresh page load) resets it.
  const [capReached, setCapReached] = useState(false);
  // How much of today's shared Vzdělání XP cap is left, for the "Dnes lze
  // ještě získat X/Y XP" line — best-effort display info only, refreshed
  // from the same cap-status check triggered on load and whenever a parent
  // changes the cap; a correct answer also nudges it down locally so it
  // doesn't visibly lag until the next server round-trip.
  const [capInfo, setCapInfo] = useState<{ headroom: number; dailyCap: number } | null>(null);
  // True from the moment an answer resolves (correct or attempts
  // exhausted) until the next question actually arrives. Deliberately
  // does *not* null out `current` in the meantime — swapping the form back
  // to the "Nová úloha" button and then back to a fresh <input> would
  // destroy and recreate the DOM node, which drops focus and, on mobile,
  // closes the on-screen keyboard (reopening it needs a real tap — a
  // programmatic focus() from a timer callback can't do that). Keeping the
  // same <input> mounted throughout, just read-only while transitioning,
  // is the only way to carry focus/keyboard across auto-advance.
  const [transitioning, setTransitioning] = useState(false);
  // Set instead of auto-advancing whenever the resolved question carries an
  // explanation — stays on screen until the member clicks "Další úloha"
  // themselves, since the whole point of an explanation is to read it, not
  // have it flash by during a fixed auto-advance delay.
  const [revealedExplanation, setRevealedExplanation] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!familyId || !user) return;
    return onSnapshot(doc(getDb(), "families", familyId, "practiceProgress", user.uid), (snap) => {
      setProgress(snap.exists() ? ({ id: snap.id, ...snap.data() } as PracticeProgress) : null);
    });
  }, [familyId, user]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // Auto-advance swaps `current` without remounting the form, so the
  // input's `autoFocus` attribute (mount-only) wouldn't fire again on the
  // next question — focus (and select any leftover text) explicitly here
  // instead so the user can start typing immediately. Also scroll it into
  // view: on mobile the on-screen keyboard covers the bottom of the page,
  // pushing the field below the fold until the user manually scrolls.
  useEffect(() => {
    if (current && !current.complete && !transitioning) {
      answerInputRef.current?.select();
      answerInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [current, transitioning]);

  // A parent can lower family.practiceDailyXpCap mid-day from Settings —
  // if the member already earned more than the new cap, practice needs to
  // stop right away, not just on the next generatePracticeProblem call
  // (which might not happen for a while if a question is already open).
  useEffect(() => {
    if (!familyId || family?.practiceDailyXpCap === undefined) return;
    const fid = familyId;
    let cancelled = false;
    async function checkCapStatus() {
      try {
        const result = await httpsCallable<{ familyId: string }, { capReached: boolean; headroom: number; dailyCap: number }>(
          getFirebaseFunctions(),
          "getPracticeCapStatus"
        )({ familyId: fid });
        if (cancelled) return;
        setCapInfo({ headroom: result.data.headroom, dailyCap: result.data.dailyCap });
        if (!result.data.capReached) return;
        setCapReached(true);
        if (autoAdvanceTimer.current) {
          clearTimeout(autoAdvanceTimer.current);
          autoAdvanceTimer.current = null;
        }
        setCurrent(null);
        setTransitioning(false);
        setRevealedExplanation(null);
        setFeedback("Rodič upravil dnešní limit XP z Vzdělání — dnes už bohužel nejde dál pokračovat.");
      } catch {
        // Best-effort — the next explicit generate/submit call still enforces the cap server-side.
      }
    }
    checkCapStatus();
    return () => {
      cancelled = true;
    };
  }, [familyId, family?.practiceDailyXpCap]);

  async function handleNewProblem() {
    if (!familyId || !GENERATE_SUBJECTS.includes(subject as Subject) || capReached) return;
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    setRevealedExplanation(null);
    try {
      const result = await httpsCallable<{ familyId: string; subject: Subject }, GenerateResponse>(
        getFirebaseFunctions(),
        "generatePracticeProblem"
      )({ familyId, subject: subject as Subject });
      setCurrent(result.data);
      if (result.data.capReached) setCapReached(true);
    } catch (err) {
      toast.error(describeError(err, "Úlohu se nepodařilo připravit."));
    } finally {
      setLoading(false);
      setTransitioning(false);
    }
  }

  function scheduleAutoAdvance(delayMs: number) {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      handleNewProblem();
    }, delayMs);
  }

  async function submitAnswer(value: string) {
    if (!familyId || !value.trim() || !current) return;
    setSubmitting(true);
    try {
      const result = await httpsCallable<{ familyId: string; answer: string }, SubmitResponse>(
        getFirebaseFunctions(),
        "submitPracticeAnswer"
      )({ familyId, answer: value.trim() });
      const data = result.data;
      const explanation = current.explanation;
      if (data.correct) {
        setAnswer("");
        if (data.awarded > 0) {
          toast.success(`Správně! +${formatXp(data.awarded)} XP`);
          setCapInfo((prev) => (prev ? { ...prev, headroom: Math.max(0, prev.headroom - data.awarded) } : prev));
        }
        if (data.capReached) {
          setCapReached(true);
          setCurrent(null);
          setFeedback("Skvělá práce! Dnešní limit XP z Vzdělání je vyčerpaný — zkus to znovu zítra.");
        } else if (explanation) {
          setRevealedExplanation(explanation);
        } else {
          setTransitioning(true);
          scheduleAutoAdvance(AUTO_ADVANCE_CORRECT_DELAY_MS);
        }
      } else if (data.attemptsLeft && data.attemptsLeft > 0) {
        setFeedback(`Není to ono, zkus to znovu — zbývá ${data.attemptsLeft} ${data.attemptsLeft === 1 ? "pokus" : "pokusy"}.`);
        setAnswer("");
      } else {
        setAnswer("");
        if (capReached) {
          setFeedback(`Správná odpověď byla: ${data.correctAnswer}.`);
          setCurrent(null);
        } else if (explanation) {
          setFeedback(`Správná odpověď byla: ${data.correctAnswer}.`);
          setRevealedExplanation(explanation);
        } else {
          setFeedback(`Správná odpověď byla: ${data.correctAnswer}. Za chvíli přijde další úloha…`);
          setTransitioning(true);
          scheduleAutoAdvance(AUTO_ADVANCE_REVEAL_DELAY_MS);
        }
      }
    } catch (err) {
      toast.error(describeError(err, "Odpověď se nepodařilo odeslat."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitAnswer(answer);
  }

  function handleLetterClick(letter: string) {
    setAnswer(letter);
    submitAnswer(letter);
  }

  function handleOptionClick(option: string) {
    setAnswer(option);
    submitAnswer(option);
  }

  async function handleGiveUp() {
    if (!familyId || !current) return;
    setSubmitting(true);
    try {
      const result = await httpsCallable<{ familyId: string }, { correctAnswer: string }>(
        getFirebaseFunctions(),
        "giveUpPracticeProblem"
      )({ familyId });
      setAnswer("");
      setFeedback(`Správná odpověď byla: ${result.data.correctAnswer}. Za chvíli přijde další úloha…`);
      setTransitioning(true);
      scheduleAutoAdvance(AUTO_ADVANCE_REVEAL_DELAY_MS);
    } catch (err) {
      toast.error(describeError(err, "Nepodařilo se načíst odpověď."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleManualAdvance() {
    setRevealedExplanation(null);
    handleNewProblem();
  }

  function selectSubject(next: string) {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSubject(next);
    setCurrent(null);
    setTransitioning(false);
    setRevealedExplanation(null);
    setAnswer("");
    setFeedback(null);
  }

  const subjectDone = progress?.[subject as Subject]?.length ?? 0;
  const subjectTotal = PRACTICE_SUBJECT_TOTALS[subject] ?? 0;
  const isIyFillIn = subject === "czech" && Boolean(current?.question && IY_FILL_IN_PATTERN.test(current.question));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Vzdělání</h1>
      <p className="text-sm text-zinc-500">
        {subject === "english" || subject === "spanish"
          ? "Nauč se slovíčka pomocí kartiček a získej +1 XP za každé uhodnuté."
          : subject === "trivia"
            ? "Vyzvi člena rodiny na kvíz o vlastní vklad XP — mimo denní limit z ostatních předmětů."
            : subject === "aiquiz"
              ? "AI ti na vybrané téma vygeneruje úplně novou otázku a získáš +1 XP za správnou odpověď — otázky se na rozdíl od ostatních předmětů nikdy neopakují ani nedojdou."
              : subject === "aitutor"
                ? "Popovídej si s AI o čemkoliv tě zajímá — vyber si téma, náročnost a styl (vysvětlení, procvičování otázkami, nebo pomoc s úkolem). Bez XP, je to studijní pomůcka, ne cvičení."
                : subject === "chess"
                ? "Skutečná hra šachu proti počítači na třech obtížnostech — za výhru získáš XP, každou obtížnost ale jen jednou denně."
                : subject === "food" || subject === "wiki" || subject === "worldbank" || subject === "games"
                  ? "Bez XP — jen k nahlédnutí a hledání."
                  : `Vyřeš úlohu a získej +${formatXp(PRACTICE_XP_PER_PROBLEM)} XP. Za den je limit, kolik XP takhle můžeš nasbírat. Jednou zodpovězenou otázku už znovu nedostaneš.`}
      </p>

      {capInfo &&
        subject !== "food" &&
        subject !== "wiki" &&
        subject !== "worldbank" &&
        subject !== "chess" &&
        subject !== "games" &&
        subject !== "trivia" &&
        subject !== "aitutor" && (
        <p className="text-xs text-zinc-500">
          Dnes lze z Vzdělání ještě získat {formatXp(capInfo.headroom)}/{formatXp(capInfo.dailyCap)} XP.
        </p>
      )}

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
      {subject === "spanish" && <SpanishFlashcards />}
      {subject === "food" && <FoodFactsExplorer />}
      {subject === "wiki" && <EncyclopediaExplorer />}
      {subject === "atlas" && <AtlasCountryList />}
      {subject === "worldbank" && <WorldBankExplorer />}
      {subject === "chess" && <ChessGame />}
      {subject === "games" && <GamesArcade familyId={familyId ?? undefined} />}
      {subject === "trivia" && familyId && <TriviaDuelPanel familyId={familyId} />}
      {subject === "aiquiz" && <AiQuizPanel />}
      {subject === "aitutor" && <AiTutorPanel />}

      {GENERATE_SUBJECTS.includes(subject as Subject) && (
        <>
          {capReached ? (
            <p className="text-sm text-zinc-500">
              🌙 Dnešní limit XP z Vzdělání je vyčerpaný — zkus to znovu zítra.
            </p>
          ) : revealedExplanation ? (
            <div className="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm">{revealedExplanation}</p>
              <button
                type="button"
                onClick={handleManualAdvance}
                disabled={loading}
                className="flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
              >
                <Sparkles size={16} /> {loading ? "Připravuji…" : "Další úloha"}
              </button>
            </div>
          ) : !current ? (
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
          ) : current.options ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <p className="text-lg font-medium">{current.question}</p>
              <div className="flex flex-col gap-2">
                {current.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionClick(option)}
                    disabled={submitting || transitioning}
                    className="rounded-lg border border-border px-4 py-2.5 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : isIyFillIn ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <p className="text-lg font-medium">{current.question}</p>
              <div className="flex gap-2">
                {IY_LETTER_OPTIONS.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleLetterClick(letter)}
                    disabled={submitting || transitioning}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-lg font-semibold disabled:opacity-50"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <p className="text-lg font-medium">{current.question}</p>
              <div className="flex gap-2">
                <input
                  ref={answerInputRef}
                  type="text"
                  autoFocus
                  readOnly={transitioning}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Tvoje odpověď"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
                />
                <button
                  type="submit"
                  disabled={submitting || transitioning || !answer.trim()}
                  className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  Odeslat
                </button>
              </div>
              {subject === "dictionary" && (
                <button
                  type="button"
                  onClick={handleGiveUp}
                  disabled={submitting || transitioning}
                  className="self-start text-sm text-zinc-500 underline disabled:opacity-50"
                >
                  Nevím, ukaž mi odpověď
                </button>
              )}
            </form>
          )}

          {!revealedExplanation && feedback && <p className="text-sm text-zinc-500">{feedback}</p>}
          {transitioning && !feedback && <p className="text-sm text-zinc-400">Za chvíli přijde další úloha…</p>}
        </>
      )}

      {member?.role === "parent" && familyId && <PracticeOverviewPanel familyId={familyId} />}
    </div>
  );
}
