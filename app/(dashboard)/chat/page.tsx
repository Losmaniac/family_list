"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { FileText, Mic, Paperclip, Send, Square } from "lucide-react";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { dateKeyInFamilyZone, formatTimeInFamilyZone } from "@/lib/date-utils";
import { compressImage } from "@/lib/image-compress";
import Avatar from "@/components/Avatar";
import type { ChatAttachment, ChatAttachmentType, ChatMessage, Member } from "@/lib/types";

const dayDividerFormatter = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

function attachmentTypeForFile(file: File): ChatAttachmentType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { familyId } = useFamily();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function sendMessage(body: string, attachment?: ChatAttachment) {
    if (!familyId || !user) return;
    await addDoc(collection(getDb(), "families", familyId, "messages"), {
      userId: user.uid,
      text: body,
      timestamp: Date.now(),
      ...(attachment ? { attachment } : {}),
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(text.trim());
      setText("");
    } catch {
      toast.error("Zprávu se nepodařilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  async function uploadAttachment(blob: Blob, contentType: string): Promise<string> {
    if (!familyId || !user) throw new Error("not ready");
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ref = storageRef(getFirebaseStorage(), `families/${familyId}/chatAttachments/${user.uid}/${fileId}`);
    await uploadBytes(ref, blob, { contentType });
    return getDownloadURL(ref);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !familyId || !user) return;
    setUploading(true);
    try {
      const type = attachmentTypeForFile(file);
      const toUpload = type === "image" ? await compressImage(file) : file;
      const contentType = (toUpload as Blob).type || file.type || "application/octet-stream";
      const url = await uploadAttachment(toUpload, contentType);
      const attachment: ChatAttachment = { type, url, ...(type === "file" ? { name: file.name } : {}) };
      await sendMessage(text.trim(), attachment);
      setText("");
    } catch {
      toast.error("Přílohu se nepodařilo odeslat.");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Nepodařilo se získat přístup k mikrofonu.");
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const durationSeconds = recordSeconds;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);

    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    recorder.stop();
    await stopped;

    if (durationSeconds < 1) return; // accidental tap, nothing worth sending
    setUploading(true);
    try {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const url = await uploadAttachment(blob, blob.type);
      const attachment: ChatAttachment = { type: "audio", url, durationSeconds };
      await sendMessage("", attachment);
    } catch {
      toast.error("Hlasovou zprávu se nepodařilo odeslat.");
    } finally {
      setUploading(false);
    }
  }

  function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
    if (attachment.type === "image") {
      return (
        <a href={attachment.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage URL, not a static asset */}
          <img src={attachment.url} alt="" className="max-h-64 max-w-full rounded-xl object-contain" />
        </a>
      );
    }
    if (attachment.type === "video") {
      return <video src={attachment.url} controls className="max-h-64 max-w-full rounded-xl" />;
    }
    if (attachment.type === "audio") {
      return (
        <div className="flex items-center gap-2">
          <audio src={attachment.url} controls className="h-10 max-w-[220px]" />
          {attachment.durationSeconds !== undefined && (
            <span className="text-xs text-zinc-400">{formatDuration(attachment.durationSeconds)}</span>
          )}
        </div>
      );
    }
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
      >
        <FileText size={18} className="shrink-0" />
        <span className="truncate">{attachment.name ?? "Soubor"}</span>
      </a>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] flex-col gap-3">
      <h1 className="text-xl font-semibold">Rodinný chat</h1>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain rounded-xl border border-border p-3">
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
                    className={`flex flex-col gap-1.5 rounded-2xl px-3 py-2 text-sm ${
                      isOwn ? "bg-accent text-accent-foreground" : "bg-surface-muted"
                    }`}
                  >
                    {message.attachment && <AttachmentView attachment={message.attachment} />}
                    {message.text && <p>{message.text}</p>}
                  </div>
                  <p className="text-[10px] text-zinc-400">{formatTimeInFamilyZone(sentAt)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelected}
        className="hidden"
      />
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recording}
          aria-label="Přiložit soubor"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-zinc-500 disabled:opacity-40"
        >
          <Paperclip size={18} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={recording}
          placeholder={uploading ? "Nahrávám…" : recording ? `Nahrávám hlas… ${formatDuration(recordSeconds)}` : "Napiš zprávu…"}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          aria-label={recording ? "Ukončit nahrávání" : "Nahrát hlasovou zprávu"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${
            recording ? "bg-danger text-white" : "border border-border text-zinc-500"
          }`}
        >
          {recording ? <Square size={16} /> : <Mic size={18} />}
        </button>
        <button
          type="submit"
          disabled={sending || uploading || recording || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="Odeslat"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
