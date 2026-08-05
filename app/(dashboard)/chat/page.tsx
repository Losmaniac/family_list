"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";
import { Send } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { dateKeyInFamilyZone, formatTimeInFamilyZone } from "@/lib/date-utils";
import Avatar from "@/components/Avatar";
import type { ChatMessage, Member } from "@/lib/types";

const dayDividerFormatter = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export default function ChatPage() {
  const { user } = useAuth();
  const { familyId } = useFamily();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familyId) return;
    const messagesQuery = query(
      collection(getDb(), "families", familyId, "messages"),
      orderBy("timestamp", "asc"),
      limitToLast(200)
    );
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "messages"), {
        userId: user.uid,
        text: text.trim(),
        timestamp: Date.now(),
      });
      setText("");
    } catch {
      toast.error("Zprávu se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col gap-3">
      <h1 className="text-xl font-semibold">Rodinný chat</h1>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-border p-3">
        {messages.length === 0 && <p className="text-sm text-zinc-500">Zatím žádné zprávy.</p>}
        {messages.map((message, index) => {
          const sender = members[message.userId];
          const isOwn = message.userId === user?.uid;
          const sentAt = new Date(message.timestamp);
          const dayKey = dateKeyInFamilyZone(sentAt);
          const previousDayKey = index > 0 ? dateKeyInFamilyZone(new Date(messages[index - 1].timestamp)) : null;
          const showDayDivider = dayKey !== previousDayKey;

          return (
            <div key={message.id} className="flex flex-col gap-2">
              {showDayDivider && (
                <p className="my-1 text-center text-xs text-zinc-500">{dayDividerFormatter.format(sentAt)}</p>
              )}
              <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                <Avatar name={sender?.name ?? "?"} avatarUrl={sender?.avatarUrl} size="sm" />
                <div className={`flex max-w-[75%] flex-col gap-0.5 ${isOwn ? "items-end" : "items-start"}`}>
                  <p className="text-xs text-zinc-500">{sender?.name ?? "Neznámý"}</p>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isOwn ? "bg-accent text-accent-foreground" : "bg-surface-muted"
                    }`}
                  >
                    {message.text}
                  </div>
                  <p className="text-[10px] text-zinc-400">{formatTimeInFamilyZone(sentAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napiš zprávu…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="Odeslat"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
