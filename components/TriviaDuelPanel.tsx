"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Swords } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import Avatar from "@/components/Avatar";
import type { Member, TriviaDuel } from "@/lib/types";

const QUESTION_COUNT_OPTIONS = [5, 8, 10] as const;

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

function memberName(members: Record<string, Member>, id: string): string {
  return members[id]?.name ?? "Někdo";
}

interface QuestionState {
  index: number;
  questionCount: number;
  question: string;
  options?: [string, string, string];
}

/**
 * "Kvízový souboj" — vyzvi jiného člena rodiny na kvíz. Každá strana vloží
 * vlastní XP vklad, obě odpoví na stejné otázky (viz functions/src/triviaDuel.ts),
 * kdo má víc správně bere celý vklad; remíza = žádná změna XP.
 */
export default function TriviaDuelPanel({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [duels, setDuels] = useState<TriviaDuel[]>([]);

  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [opponentId, setOpponentId] = useState("");
  const [stakeInput, setStakeInput] = useState("10");
  const [questionCount, setQuestionCount] = useState<(typeof QUESTION_COUNT_OPTIONS)[number]>(8);
  const [creating, setCreating] = useState(false);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondStake, setRespondStake] = useState("10");
  const [responding, setResponding] = useState(false);

  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionState | null>(null);
  const [activeAnswer, setActiveAnswer] = useState("");
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);
  const [activeDone, setActiveDone] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snap) => {
      const byId: Record<string, Member> = {};
      for (const d of snap.docs) byId[d.id] = { id: d.id, ...d.data() } as Member;
      setMembers(byId);
    });
  }, [familyId]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(getDb(), "families", familyId, "triviaDuels"), (snap) => {
      const mine = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as TriviaDuel)
        .filter((d) => d.challengerId === user.uid || d.opponentId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt);
      setDuels(mine);
    });
  }, [familyId, user]);

  const otherMembers = Object.values(members).filter((m) => m.id !== user?.uid);

  async function handleCreateChallenge(e: React.FormEvent) {
    e.preventDefault();
    const stake = Number(stakeInput);
    if (!opponentId || !Number.isFinite(stake) || stake <= 0) {
      toast.error("Vyber soupeře a zadej platný vklad.");
      return;
    }
    setCreating(true);
    try {
      await httpsCallable<{ familyId: string; opponentId: string; stake: number; questionCount: number }, { duelId: string }>(
        getFirebaseFunctions(),
        "createTriviaDuel"
      )({ familyId, opponentId, stake: Math.round(stake), questionCount });
      toast.success(`Výzva odeslána — ${memberName(members, opponentId)} teď musí odpovědět.`);
      setShowChallengeForm(false);
      setOpponentId("");
      setStakeInput("10");
    } catch (err) {
      toast.error(describeError(err, "Výzvu se nepodařilo odeslat."));
    } finally {
      setCreating(false);
    }
  }

  async function handleRespond(duel: TriviaDuel, accept: boolean) {
    setResponding(true);
    try {
      const stake = Number(respondStake);
      if (accept && (!Number.isFinite(stake) || stake <= 0)) {
        toast.error("Zadej platný vklad.");
        setResponding(false);
        return;
      }
      await httpsCallable<{ familyId: string; duelId: string; accept: boolean; stake?: number }, { status: string }>(
        getFirebaseFunctions(),
        "respondToTriviaDuel"
      )({ familyId, duelId: duel.id, accept, stake: accept ? Math.round(stake) : undefined });
      toast.success(accept ? "Souboj začíná!" : "Výzva odmítnuta.");
      setRespondingId(null);
    } catch (err) {
      toast.error(describeError(err, "Nepodařilo se odpovědět na výzvu."));
    } finally {
      setResponding(false);
    }
  }

  async function handleCancel(duel: TriviaDuel) {
    try {
      await httpsCallable<{ familyId: string; duelId: string }, { status: string }>(getFirebaseFunctions(), "cancelTriviaDuel")({
        familyId,
        duelId: duel.id,
      });
      toast.success("Výzva zrušena.");
    } catch (err) {
      toast.error(describeError(err, "Výzvu se nepodařilo zrušit."));
    }
  }

  async function openDuel(duelId: string) {
    setActiveDuelId(duelId);
    setActiveAnswer("");
    setActiveFeedback(null);
    setActiveDone(false);
    await loadNextQuestion(duelId);
  }

  async function loadNextQuestion(duelId: string) {
    setLoadingQuestion(true);
    try {
      const result = await httpsCallable<
        { familyId: string; duelId: string },
        { complete: boolean; index?: number; questionCount?: number; question?: string; options?: [string, string, string] }
      >(
        getFirebaseFunctions(),
        "getTriviaDuelQuestion"
      )({ familyId, duelId });
      if (result.data.complete || !result.data.question) {
        setActiveDone(true);
        setActiveQuestion(null);
      } else {
        setActiveQuestion({
          index: result.data.index!,
          questionCount: result.data.questionCount!,
          question: result.data.question,
          options: result.data.options,
        });
      }
    } catch (err) {
      toast.error(describeError(err, "Otázku se nepodařilo načíst."));
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function submitAnswer(value: string) {
    if (!activeDuelId || !value.trim()) return;
    setSubmittingAnswer(true);
    try {
      const result = await httpsCallable<
        { familyId: string; duelId: string; answer: string },
        { correct: boolean; correctAnswer: string; done: boolean }
      >(
        getFirebaseFunctions(),
        "submitTriviaDuelAnswer"
      )({ familyId, duelId: activeDuelId, answer: value.trim() });
      setActiveAnswer("");
      setActiveFeedback(result.data.correct ? "Správně!" : `Bylo to: ${result.data.correctAnswer}`);
      await loadNextQuestion(activeDuelId);
    } catch (err) {
      toast.error(describeError(err, "Odpověď se nepodařilo odeslat."));
    } finally {
      setSubmittingAnswer(false);
    }
  }

  const activeDuel = duels.find((d) => d.id === activeDuelId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Vyzvi člena rodiny na kvíz — každý vloží vlastní vklad XP, oba dostanete stejné otázky z okruhů, které už
        znáte z Vzdělání. Kdo má víc správně, bere celý vklad. Remíza = nikomu se XP nemění.
      </p>

      {!showChallengeForm ? (
        <button
          type="button"
          onClick={() => setShowChallengeForm(true)}
          disabled={otherMembers.length === 0}
          className="flex items-center gap-1.5 self-start rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          <Swords size={16} /> Vyzvat na souboj
        </button>
      ) : (
        <form onSubmit={handleCreateChallenge} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <label className="flex flex-col gap-1 text-sm">
            Koho vyzýváš?
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              required
              className="rounded-lg border border-border bg-surface px-4 py-2"
            >
              <option value="">Vyber soupeře…</option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tvůj vklad (XP)
            <input
              type="number"
              min={1}
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-2"
            />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            Počet otázek
            <div className="flex gap-2">
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`rounded-full px-3 py-1.5 text-sm ${questionCount === n ? "bg-accent text-accent-foreground" : "border border-border"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {creating ? "Odesílám…" : "Poslat výzvu"}
            </button>
            <button
              type="button"
              onClick={() => setShowChallengeForm(false)}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {duels.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-zinc-500">
          <Swords size={40} />
          <p className="text-lg">Zatím žádné souboje — vyzvi někoho výš.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {duels.map((duel) => {
            const isChallenger = duel.challengerId === user?.uid;
            const opponent = isChallenger ? duel.opponentId : duel.challengerId;
            const myScore = isChallenger ? duel.challengerScore : duel.opponentScore;
            const otherScore = isChallenger ? duel.opponentScore : duel.challengerScore;
            const myStake = isChallenger ? duel.challengerStake : duel.opponentStake;

            return (
              <div key={duel.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <Avatar name={memberName(members, opponent)} avatarUrl={members[opponent]?.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {isChallenger ? "Vyzval(a) jsi" : "Vyzval(a) tě"} {memberName(members, opponent)}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {duel.status === "pending_acceptance" && "Čeká na odpověď"}
                    {duel.status === "declined" && "Odmítnuto"}
                    {duel.status === "cancelled" && "Zrušeno"}
                    {duel.status === "in_progress" && `Vklad: ${myStake != null ? formatXp(myStake) : "?"} XP`}
                    {duel.status === "completed" &&
                      (duel.winnerId === "tie"
                        ? "Remíza — bez změny XP"
                        : duel.winnerId === user?.uid
                          ? `Vyhrál(a) jsi! ${myScore}:${otherScore}`
                          : `Prohrál(a) jsi. ${myScore}:${otherScore}`)}
                  </p>
                </div>

                {duel.status === "pending_acceptance" && !isChallenger && respondingId !== duel.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setRespondingId(duel.id);
                      setRespondStake(String(duel.challengerStake));
                    }}
                    className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                  >
                    Reagovat
                  </button>
                )}
                {duel.status === "pending_acceptance" && isChallenger && (
                  <button
                    type="button"
                    onClick={() => handleCancel(duel)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold"
                  >
                    Zrušit
                  </button>
                )}
                {duel.status === "in_progress" && (
                  <button
                    type="button"
                    onClick={() => openDuel(duel.id)}
                    className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                  >
                    Hrát
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {respondingId &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setRespondingId(null)}>
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-t-2xl bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const duel = duels.find((d) => d.id === respondingId);
              if (!duel) return null;
              return (
                <>
                  <p className="font-medium">
                    {memberName(members, duel.challengerId)} tě vyzval(a) — vklad {formatXp(duel.challengerStake)} XP
                  </p>
                  <label className="flex flex-col gap-1 text-sm">
                    Tvůj vklad (XP)
                    <input
                      type="number"
                      min={1}
                      value={respondStake}
                      onChange={(e) => setRespondStake(e.target.value)}
                      className="rounded-lg border border-border bg-surface px-4 py-2"
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRespond(duel, true)}
                      disabled={responding}
                      className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      Přijmout
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(duel, false)}
                      disabled={responding}
                      className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      Odmítnout
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
          </div>,
          document.body
        )}

      {activeDuelId &&
        activeDuel &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setActiveDuelId(null)}>
          <div
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-t-2xl bg-surface p-6 text-center sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingQuestion ? (
              <p className="text-sm text-zinc-500">Načítám…</p>
            ) : activeDone ? (
              <>
                <p className="text-lg font-semibold">Hotovo — čekáš na soupeře.</p>
                <p className="text-sm text-zinc-500">Jakmile taky odpoví, uvidíš výsledek v seznamu soubojů.</p>
                <button
                  type="button"
                  onClick={() => setActiveDuelId(null)}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
                >
                  Zavřít
                </button>
              </>
            ) : activeQuestion ? (
              <>
                <p className="text-sm text-zinc-500">
                  Otázka {activeQuestion.index + 1} / {activeQuestion.questionCount}
                </p>
                <p className="text-lg font-medium">{activeQuestion.question}</p>
                {activeQuestion.options ? (
                  <div className="flex w-full flex-col gap-2">
                    {activeQuestion.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => submitAnswer(option)}
                        disabled={submittingAnswer}
                        className="rounded-lg border border-border px-4 py-2.5 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitAnswer(activeAnswer);
                    }}
                    className="flex w-full gap-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={activeAnswer}
                      onChange={(e) => setActiveAnswer(e.target.value)}
                      placeholder="Tvoje odpověď"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
                    />
                    <button
                      type="submit"
                      disabled={submittingAnswer || !activeAnswer.trim()}
                      className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      Odeslat
                    </button>
                  </form>
                )}
                {activeFeedback && <p className="text-sm text-zinc-500">{activeFeedback}</p>}
              </>
            ) : null}
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
