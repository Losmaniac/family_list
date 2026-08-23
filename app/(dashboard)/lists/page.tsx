"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { Gift, Lightbulb, List as ListIcon, Luggage, Phone, Plus, ShoppingCart, Trash2, Wrench } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { LIST_PRESETS } from "@/lib/lists";
import ShoppingListView from "@/components/ShoppingListView";
import GenericListView from "@/components/GenericListView";
import type { FamilyList, ListKind } from "@/lib/types";

const KIND_ICONS: Record<ListKind, typeof Gift> = {
  wishlist: Gift,
  ideas: Lightbulb,
  howto: Wrench,
  packing: Luggage,
  emergency: Phone,
  custom: ListIcon,
};

/** "shopping" is a UI-only sentinel — the shopping list itself lives in the separate, unchanged shoppingItems collection, not in `lists`. */
type Selection = "shopping" | string;

export default function ListsPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const isParent = member?.role === "parent";

  const [lists, setLists] = useState<FamilyList[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [selected, setSelected] = useState<Selection>("shopping");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<ListKind>("custom");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "lists"), (snapshot) => {
      setLists(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FamilyList));
      setListsLoaded(true);
    });
  }, [familyId]);

  // One-time seed of the built-in presets (wishlist, nápady na zlepšení,
  // návody pro chod domu) the first time a parent opens this card and none
  // of that kind exists yet — makes them "just there" without every family
  // needing to manually recreate the same three lists by hand. Gated to
  // isParent since list creation is parent-only under firestore.rules; a
  // child opening this first would otherwise hit a silent permission denial.
  useEffect(() => {
    if (!familyId || !user || !isParent || !listsLoaded) return;
    const existingKinds = new Set(lists.map((l) => l.kind));
    const missing = LIST_PRESETS.filter((preset) => !existingKinds.has(preset.kind));
    if (missing.length === 0) return;
    for (const preset of missing) {
      addDoc(collection(getDb(), "families", familyId, "lists"), {
        title: preset.title,
        kind: preset.kind,
        ...(preset.categories ? { categories: preset.categories } : {}),
        createdBy: user.uid,
        createdAt: Date.now(),
      }).catch(() => {
        // Best-effort seeding — if it fails, the parent can still add these by hand below.
      });
    }
  }, [familyId, user, isParent, listsLoaded, lists]);

  async function handleAddList(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !newTitle.trim()) return;
    setSubmitting(true);
    try {
      const preset = LIST_PRESETS.find((p) => p.kind === newKind);
      await addDoc(collection(getDb(), "families", familyId, "lists"), {
        title: newTitle.trim(),
        kind: newKind,
        ...(preset?.categories ? { categories: preset.categories } : {}),
        createdBy: user.uid,
        createdAt: Date.now(),
      });
      toast.success("Seznam byl přidán.");
      setNewTitle("");
      setNewKind("custom");
      setShowAddForm(false);
    } catch {
      toast.error("Seznam se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteList(list: FamilyList) {
    if (!familyId) return;
    const ok = await confirm({
      title: `Smazat seznam „${list.title}“?`,
      description: "Všechny jeho položky budou nenávratně smazány.",
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "lists", list.id));
      if (selected === list.id) setSelected("shopping");
    } catch {
      toast.error("Seznam se nepodařilo smazat.");
    }
  }

  const selectedList = selected === "shopping" ? null : lists.find((l) => l.id === selected);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Seznamy</h1>
        <p className="text-sm text-zinc-500">Nákupní seznam, přání, nápady a další — sdílené s celou rodinou.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected("shopping")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
            selected === "shopping" ? "bg-accent text-accent-foreground" : "border border-border text-zinc-500"
          }`}
        >
          <ShoppingCart size={14} /> Nákupní seznam
        </button>
        {lists.map((list) => {
          const Icon = KIND_ICONS[list.kind];
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelected(list.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                selected === list.id ? "bg-accent text-accent-foreground" : "border border-border text-zinc-500"
              }`}
            >
              <Icon size={14} /> {list.title}
            </button>
          );
        })}
        {isParent && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            aria-label="Přidat seznam"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-accent"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddList} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Název seznamu"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {(["custom", ...LIST_PRESETS.map((p) => p.kind)] as ListKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setNewKind(kind)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  newKind === kind ? "bg-accent text-accent-foreground" : "border border-border"
                }`}
              >
                {kind === "custom" ? "Vlastní" : LIST_PRESETS.find((p) => p.kind === kind)?.title}
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

      {selectedList && isParent && (
        <button
          type="button"
          onClick={() => handleDeleteList(selectedList)}
          className="flex items-center gap-1.5 self-end text-sm text-danger"
        >
          <Trash2 size={14} /> Smazat tento seznam
        </button>
      )}

      {selected === "shopping" ? (
        <ShoppingListView />
      ) : selectedList && familyId ? (
        <GenericListView key={selectedList.id} familyId={familyId} list={selectedList} />
      ) : null}
    </div>
  );
}
