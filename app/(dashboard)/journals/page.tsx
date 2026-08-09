"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { BookOpen, Dumbbell, Plus, Trash2, Utensils } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { JOURNAL_PRESETS } from "@/lib/journals";
import { xpAdjustmentNeedsApproval as needsSecondParentApproval } from "@/lib/xp-engine";
import JournalEntriesView from "@/components/JournalEntriesView";
import type { Journal, JournalKind, Member } from "@/lib/types";

const KIND_ICONS: Record<JournalKind, typeof BookOpen> = {
  food: Utensils,
  training: Dumbbell,
  custom: BookOpen,
};

export default function JournalsPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const isParent = member?.role === "parent";

  const [journals, setJournals] = useState<Journal[]>([]);
  const [journalsLoaded, setJournalsLoaded] = useState(false);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<JournalKind>("custom");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "journals"), (snapshot) => {
      const next = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Journal);
      setJournals(next);
      setJournalsLoaded(true);
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      setMembers(next);
    });
  }, [familyId]);

  // Same one-time seeding idea as Seznamy's list presets — the food/training
  // diaries just exist once a parent opens this card, no manual setup step.
  useEffect(() => {
    if (!familyId || !user || !isParent || !journalsLoaded) return;
    const existingKinds = new Set(journals.map((j) => j.kind));
    const missing = JOURNAL_PRESETS.filter((preset) => !existingKinds.has(preset.kind));
    if (missing.length === 0) return;
    for (const preset of missing) {
      addDoc(collection(getDb(), "families", familyId, "journals"), {
        title: preset.title,
        kind: preset.kind,
        createdBy: user.uid,
        createdAt: Date.now(),
      }).catch(() => {
        // Best-effort seeding — if it fails, the parent can still add these by hand below.
      });
    }
  }, [familyId, user, isParent, journalsLoaded, journals]);

  async function handleAddJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !newTitle.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "journals"), {
        title: newTitle.trim(),
        kind: newKind,
        createdBy: user.uid,
        createdAt: Date.now(),
      });
      toast.success("Deník byl přidán.");
      setNewTitle("");
      setNewKind("custom");
      setShowAddForm(false);
    } catch {
      toast.error("Deník se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteJournal(journal: Journal) {
    if (!familyId || !user) return;
    const parentCount = Object.values(members).filter((m) => m.role === "parent").length;
    const needsApproval = needsSecondParentApproval(parentCount);
    const ok = await confirm({
      title: `Smazat deník „${journal.title}“?`,
      description: needsApproval
        ? "Všechny jeho záznamy budou nenávratně smazány, jakmile žádost schválí druhý rodič."
        : "Všechny jeho záznamy budou nenávratně smazány.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await addDoc(collection(getDb(), "families", familyId, "journalDeletionRequests"), {
        targetType: "journal",
        targetId: journal.id,
        targetLabel: journal.title,
        requestedBy: user.uid,
        status: "requested",
        timestamp: Date.now(),
      });
      toast.success(needsApproval ? "Žádost o smazání odeslána, čeká na schválení druhým rodičem." : "Deník byl smazán.");
    } catch {
      toast.error("Žádost o smazání se nepodařilo odeslat.");
    }
  }

  // Defaults to the first diary once any exist and nothing's been explicitly picked yet.
  const selected = (selectedId ? journals.find((j) => j.id === selectedId) : undefined) ?? journals[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Deníky</h1>
        <p className="text-sm text-zinc-500">Stravovací, tréninkový nebo vlastní deník — každý si zapisuje svoje.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {journals.map((journal) => {
          const Icon = KIND_ICONS[journal.kind];
          return (
            <button
              key={journal.id}
              type="button"
              onClick={() => setSelectedId(journal.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                selectedId === journal.id ? "bg-accent text-accent-foreground" : "border border-border text-zinc-500"
              }`}
            >
              <Icon size={14} /> {journal.title}
            </button>
          );
        })}
        {isParent && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            aria-label="Přidat deník"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-accent"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddJournal} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Název deníku"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {(["custom", ...JOURNAL_PRESETS.map((p) => p.kind)] as JournalKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setNewKind(kind)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  newKind === kind ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {kind === "custom" ? "Vlastní" : JOURNAL_PRESETS.find((p) => p.kind === kind)?.title}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Přidat
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {selected && isParent && (
        <button
          type="button"
          onClick={() => handleDeleteJournal(selected)}
          className="flex items-center gap-1.5 self-end text-sm text-danger"
        >
          <Trash2 size={14} /> Smazat tento deník
        </button>
      )}

      {selected && familyId ? (
        <JournalEntriesView key={selected.id} familyId={familyId} journal={selected} members={members} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <BookOpen size={40} />
          <p className="text-lg">{isParent ? "Zakládám výchozí deníky…" : "Rodič zatím nezaložil žádný deník."}</p>
        </div>
      )}
    </div>
  );
}
