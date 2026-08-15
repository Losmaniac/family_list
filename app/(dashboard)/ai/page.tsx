"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Bot, History, Plus, Send } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import {
  MAX_AI_ASSISTANT_HISTORY,
  summarizeAiAssistantConversations,
  type AiAssistantHistoryMessage,
} from "@/lib/ai-assistant";
import type { AiAssistantMessage } from "@/lib/types";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

function newConversationId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * "AI" — a standalone, general-purpose ChatGPT-style assistant card,
 * deliberately separate from Vzdělání's "AI učitel" (no subject/depth/mode
 * setup, just an open conversation). Each member only ever sees their own
 * conversations (firestore.rules' aiAssistantMessages — no parent-oversight
 * exception, unlike the tutor). See functions/src/aiAssistant.ts.
 */
export default function AiPage() {
  const { user } = useAuth();
  const { familyId, family } = useFamily();
  const toast = useToast();

  const [allMessages, setAllMessages] = useState<AiAssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const configured = family?.geminiApiKeyConfigured === true || family?.openRouterApiKeyConfigured === true;

  useEffect(() => {
    if (!familyId || !user) return;
    const q = query(
      collection(getDb(), "families", familyId, "aiAssistantMessages", user.uid, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snapshot) => {
      setAllMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AiAssistantMessage));
    });
  }, [familyId, user]);

  const conversations = useMemo(() => summarizeAiAssistantConversations(allMessages), [allMessages]);

  const threadMessages = useMemo(
    () => (conversationId ? allMessages.filter((m) => m.conversationId === conversationId) : []),
    [allMessages, conversationId]
  );

  function startNewConversation() {
    setConversationId(newConversationId());
    setShowHistory(false);
  }

  function openConversation(id: string) {
    setConversationId(id);
    setShowHistory(false);
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !question.trim() || sending) return;
    const activeId = conversationId ?? newConversationId();
    if (!conversationId) setConversationId(activeId);

    const asked = question.trim();
    const history: AiAssistantHistoryMessage[] = threadMessages
      .slice(-MAX_AI_ASSISTANT_HISTORY)
      .map((m) => ({ role: m.role, text: m.text }));

    setSending(true);
    setPendingQuestion(asked);
    setQuestion("");
    try {
      const call = httpsCallable<
        { familyId: string; conversationId: string; question: string; history: AiAssistantHistoryMessage[] },
        { answer: string }
      >(getFirebaseFunctions(), "askAiAssistant");
      await call({ familyId, conversationId: activeId, question: asked, history });
    } catch (err) {
      toast.error(describeError(err, "Zprávu se nepodařilo odeslat."));
      setQuestion(asked);
    } finally {
      setSending(false);
      setPendingQuestion(null);
    }
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-zinc-500">
        <Bot size={32} />
        <p>Rodič ještě nezadal API klíč pro AI v Nastavení.</p>
      </div>
    );
  }

  const showConversationList = !conversationId || showHistory;

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-1.5 text-xl font-semibold">
          <Bot size={22} /> AI
        </h1>
        <div className="flex gap-2">
          {conversationId && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              aria-label="Historie konverzací"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-zinc-500"
            >
              <History size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <Plus size={16} /> Nová konverzace
          </button>
        </div>
      </div>

      {showConversationList ? (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center text-zinc-500">
              <Bot size={32} />
              <p>Zeptej se na cokoliv — klidně to zkus napsat rovnou.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.conversationId}
                type="button"
                onClick={() => openConversation(c.conversationId)}
                className="flex flex-col items-start gap-0.5 rounded-xl border border-border px-3 py-2 text-left"
              >
                <span className="font-medium">{c.title}</span>
                <span className="text-[10px] text-zinc-400">{formatDateTimeInFamilyZone(new Date(c.lastMessageAt))}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain rounded-xl border border-border p-3">
          {threadMessages.length === 0 && !pendingQuestion && (
            <p className="text-sm text-zinc-500">Napiš první zprávu.</p>
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
                <div className="rounded-2xl bg-surface-muted px-3 py-2 text-sm text-zinc-400">Přemýšlí…</div>
              </div>
            </>
          )}
        </div>
      )}

      {!showHistory && (
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
      )}
    </div>
  );
}
