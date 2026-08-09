"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { ChevronDown, ChevronRight, ClipboardList, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatCompletedAt, groupItemsByCategory } from "@/lib/lists";
import type { FamilyList, FamilyListItem } from "@/lib/types";

function emptyForm(defaultCategory: string) {
  return { name: "", note: "", category: defaultCategory };
}

/** Module-scope (not component-body) so Date.now() here isn't subject to the react-compiler's render-purity analysis. */
function nowMs(): number {
  return Date.now();
}

/** Any non-shopping list on the Seznamy card (wishlist, ideas, house how-tos, or a parent's custom one) — backed by families/{familyId}/listItems, filtered to this list's id. Mount with key={list.id} so switching lists resets the add-item form cleanly. */
export default function GenericListView({ familyId, list }: { familyId: string; list: FamilyList }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<FamilyListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(list.categories?.[0] ?? ""));
  const [submitting, setSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const itemsQuery = query(collection(getDb(), "families", familyId, "listItems"), where("listId", "==", list.id));
    return onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FamilyListItem));
    });
  }, [familyId, list.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "listItems"), {
        listId: list.id,
        name: form.name.trim(),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
        ...(form.category ? { category: form.category } : {}),
        checked: false,
        addedBy: user.uid,
        timestamp: Date.now(),
      });
      setForm(emptyForm(form.category));
    } catch {
      toast.error("Položku se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleChecked(item: FamilyListItem) {
    const next = !item.checked;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "listItems", item.id), {
        checked: next,
        completedAt: next ? nowMs() : null,
      });
    } catch {
      toast.error("Nepodařilo se uložit změnu.");
    }
  }

  async function handleDelete(item: FamilyListItem) {
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "listItems", item.id));
    } catch {
      toast.error("Položku se nepodařilo odebrat.");
    }
  }

  const activeItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);
  const activeGroups = groupItemsByCategory(activeItems, list.categories);
  const checkedGroups = groupItemsByCategory(checkedItems, list.categories);

  function renderItem(item: FamilyListItem, checked: boolean) {
    return (
      <div
        key={item.id}
        className={`flex items-start gap-3 rounded-xl border border-border px-4 py-2.5 ${checked ? "bg-surface-muted" : "bg-surface"}`}
      >
        <button
          type="button"
          onClick={() => toggleChecked(item)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            checked ? "border-accent bg-accent" : "border-zinc-300"
          }`}
          aria-label={checked ? "Vrátit zpět" : "Označit jako hotovo"}
        />
        <div className="min-w-0 flex-1">
          <p className={checked ? "truncate text-zinc-400 line-through" : "truncate"}>{item.name}</p>
          {item.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-500">{item.note}</p>}
          {checked && formatCompletedAt(item.completedAt) && (
            <p className="mt-0.5 text-xs text-zinc-400">{formatCompletedAt(item.completedAt)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleDelete(item)}
          aria-label="Odebrat"
          className="shrink-0 text-zinc-400 hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex shrink-0 items-center gap-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          <Plus size={16} /> Přidat položku
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <input
            type="text"
            required
            autoFocus
            placeholder="Název"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <textarea
            placeholder="Poznámka (nepovinné)"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            rows={2}
            className="resize-none rounded-lg border border-border bg-surface px-4 py-2"
          />
          {list.categories && list.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {list.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    form.category === cat ? "bg-accent text-accent-foreground" : "border border-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Přidat
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

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <ClipboardList size={40} />
          <p className="text-lg">Seznam je prázdný.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {activeGroups.map(({ category, items: groupItems }) => (
            <section key={category ?? "_flat"} className="flex flex-col gap-2">
              {category && <h2 className="text-sm font-medium text-zinc-500">{category}</h2>}
              <div className="flex flex-col gap-1.5">{groupItems.map((item) => renderItem(item, false))}</div>
            </section>
          ))}

          {checkedItems.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="-mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-400"
              >
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Dokončené ({checkedItems.length})
              </button>
              {showCompleted &&
                checkedGroups.map(({ category, items: groupItems }) => (
                  <section key={category ?? "_flat"} className="flex flex-col gap-2">
                    {category && <h3 className="text-sm font-medium text-zinc-500">{category}</h3>}
                    <div className="flex flex-col gap-1.5">{groupItems.map((item) => renderItem(item, true))}</div>
                  </section>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
