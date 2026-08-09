"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { dateKeyInFamilyZone } from "@/lib/date-utils";
import Avatar from "@/components/Avatar";
import type { Journal, JournalEntry, Member } from "@/lib/types";

function emptyForm() {
  return { date: dateKeyInFamilyZone(new Date()), text: "" };
}

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

/** Chronological (newest first) entry log for one diary — backed by families/{familyId}/journalEntries filtered to this journal's id. Mount with key={journal.id} so switching diaries resets the add-entry form. */
export default function JournalEntriesView({
  familyId,
  journal,
  members,
}: {
  familyId: string;
  journal: Journal;
  members: Record<string, Member>;
}) {
  const { user } = useAuth();
  const { member } = useFamily();
  const toast = useToast();
  const isParent = member?.role === "parent";

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const entriesQuery = query(collection(getDb(), "families", familyId, "journalEntries"), where("journalId", "==", journal.id));
    return onSnapshot(entriesQuery, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as JournalEntry));
    });
  }, [familyId, journal.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.text.trim() || !form.date) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "journalEntries"), {
        journalId: journal.id,
        authorId: user.uid,
        date: form.date,
        text: form.text.trim(),
        timestamp: Date.now(),
      });
      setForm(emptyForm());
      setShowForm(false);
    } catch {
      toast.error("Záznam se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(entry: JournalEntry) {
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "journalEntries", entry.id));
    } catch {
      toast.error("Záznam se nepodařilo smazat.");
    }
  }

  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex flex-col gap-4">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex shrink-0 items-center gap-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          <Plus size={16} /> Přidat záznam
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="self-start rounded-lg border border-border bg-surface px-4 py-2"
          />
          <textarea
            required
            autoFocus
            placeholder="Co si zapsat?"
            value={form.text}
            onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
            rows={3}
            className="resize-none rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.text.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <NotebookPen size={40} />
          <p className="text-lg">Zatím žádné záznamy.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry) => {
            const author = members[entry.authorId];
            const canDelete = entry.authorId === user?.uid || isParent;
            return (
              <div key={entry.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                <Avatar name={author?.name ?? "?"} avatarUrl={author?.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>{author?.name ?? "Neznámý"}</span>
                    <span>·</span>
                    <span>{dateFormatter.format(new Date(`${entry.date}T00:00:00`))}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap">{entry.text}</p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    aria-label="Smazat záznam"
                    className="shrink-0 text-zinc-400 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
