"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { GraduationCap, Send } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import {
  AI_TUTOR_DEPTHS,
  AI_TUTOR_MODES,
  MAX_AI_TUTOR_HISTORY,
  buildAiTutorKickoffMessage,
  normalizeAiTutorSubject,
  type AiTutorDepth,
  type AiTutorHistoryMessage,
  type AiTutorMode,
} from "@/lib/ai-tutor";
import type { AiTutorMessage } from "@/lib/types";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/**
 * "AI učitel" — an open-ended tutoring chat: pick any subject, a depth, and
 * a mode (explain / quiz-me / help-with-homework), then chat. Unlike "AI
 * otázky" this has no fixed topic list and no XP — it's a study aid for a
 * kid or an adult alike, not a graded exercise. See functions/src/aiTutor.ts
 * for the actual generation; conversation history is scoped per subject
 * client-side (subjectMessages below) so switching topic starts fresh.
 */
export default function AiTutorPanel() {
  const { user } = useAuth();
  const { familyId, family } = useFamily();
  const toast = useToast();

  const [subject, setSubject] = useState<string | null>(null);
  const [subjectInput, setSubjectInput] = useState("");
  const [depth, setDepth] = useState<AiTutorDepth>("basics");
  const [mode, setMode] = useState<AiTutorMode>("explain");
  const [allMessages, setAllMessages] = useState<AiTutorMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [awaitingKickoff, setAwaitingKickoff] = useState(false);

  const configured = family?.geminiApiKeyConfigured === true || family?.openRouterApiKeyConfigured === true;

  useEffect(() => {
    if (!familyId || !user) return;
    const q = query(
      collection(getDb(), "families", familyId, "aiTutorMessages", user.uid, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snapshot) => {
      setAllMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AiTutorMessage));
    });
  }, [familyId, user]);

  const threadMessages = useMemo(
    () => (subject ? allMessages.filter((m) => m.subject === subject) : []),
    [allMessages, subject]
  );

  async function askQuestion(
    subjectForCall: string,
    asked: string,
    history: AiTutorHistoryMessage[],
    options: { showPending: boolean } = { showPending: true }
  ) {
    if (!familyId || sending) return;
    setSending(true);
    if (options.showPending) setPendingQuestion(asked);
    else setAwaitingKickoff(true);
    try {
      const call = httpsCallable<
        { familyId: string; subject: string; depth: AiTutorDepth; mode: AiTutorMode; question: string; history: AiTutorHistoryMessage[] },
        { answer: string }
      >(getFirebaseFunctions(), "askAiTutor");
      await call({ familyId, subject: subjectForCall, depth, mode, question: asked, history });
    } catch (err) {
      toast.error(describeError(err, "Zprávu se nepodařilo odeslat."));
      if (options.showPending) setQuestion(asked);
    } finally {
      setSending(false);
      setPendingQuestion(null);
      setAwaitingKickoff(false);
    }
  }

  function startConversation(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeAiTutorSubject(subjectInput);
    if (!normalized) return;
    setSubject(normalized);
    void askQuestion(normalized, buildAiTutorKickoffMessage(normalized, mode), [], { showPending: false });
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !subject || !question.trim() || sending) return;
    const asked = question.trim();
    const history: AiTutorHistoryMessage[] = threadMessages
      .slice(-MAX_AI_TUTOR_HISTORY)
      .map((m) => ({ role: m.role, text: m.text }));
    setQuestion("");
    await askQuestion(subject, asked, history);
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-zinc-500">
        <GraduationCap size={32} />
        <p>Rodič ještě nezadal API klíč pro AI v Nastavení.</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <form onSubmit={startConversation} className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          Zeptej se na cokoliv — od školní látky po téma, které tě prostě zajímá.
        </p>
        <input
          type="text"
          required
          autoFocus
          placeholder="Na jaké téma? (např. fotosyntéza, druhá světová válka, úroková sazba…)"
          value={subjectInput}
          onChange={(e) => setSubjectInput(e.target.value)}
          className="rounded-lg border border-border bg-surface px-4 py-2"
        />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-zinc-500">Náročnost</p>
          <div className="flex flex-wrap gap-2">
            {AI_TUTOR_DEPTHS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDepth(d.value)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  depth === d.value ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-zinc-500">Styl</p>
          <div className="flex flex-wrap gap-2">
            {AI_TUTOR_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  mode === m.value ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400">{AI_TUTOR_MODES.find((m) => m.value === mode)?.description}</p>
        </div>
        <button
          type="submit"
          disabled={!subjectInput.trim()}
          className="self-start rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          Začít
        </button>
      </form>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-18rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{subject}</p>
          <p className="text-xs text-zinc-500">
            {AI_TUTOR_DEPTHS.find((d) => d.value === depth)?.label} · {AI_TUTOR_MODES.find((m) => m.value === mode)?.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubject(null)}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
        >
          Nové téma
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain rounded-xl border border-border p-3">
        {threadMessages.length === 0 && !pendingQuestion && !awaitingKickoff && (
          <p className="text-sm text-zinc-500">Zatím žádné zprávy.</p>
        )}
        {awaitingKickoff && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-surface-muted px-3 py-2 text-sm text-zinc-400">Lektor připravuje vysvětlení…</div>
          </div>
        )}
        {threadMessages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-accent text-accent-foreground" : "bg-surface-muted"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pendingQuestion && (
          <>
            <div className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground">
                {pendingQuestion}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-muted px-3 py-2 text-sm text-zinc-400">Lektor přemýšlí…</div>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex items-center gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={sending}
          placeholder="Napiš zprávu…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !question.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="Odeslat"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
