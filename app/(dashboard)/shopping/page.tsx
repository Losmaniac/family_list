"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { effectiveShoppingCategories } from "@/lib/shopping";
import type { ShoppingItem } from "@/lib/types";

function emptyForm(defaultCategory: string) {
  return { name: "", quantity: "", category: defaultCategory };
}

export default function ShoppingPage() {
  const { user } = useAuth();
  const { familyId, family } = useFamily();
  const toast = useToast();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const categories = effectiveShoppingCategories(family?.shoppingCategories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(categories[0]));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "shoppingItems"), (snapshot) => {
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ShoppingItem));
    });
  }, [familyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !form.name.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "shoppingItems"), {
        name: form.name.trim(),
        quantity: form.quantity.trim() || null,
        category: form.category,
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

  async function toggleChecked(item: ShoppingItem) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "shoppingItems", item.id), { checked: !item.checked });
    } catch {
      toast.error("Nepodařilo se uložit změnu.");
    }
  }

  async function handleDelete(item: ShoppingItem) {
    if (!familyId) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "shoppingItems", item.id));
    } catch {
      toast.error("Položku se nepodařilo odebrat.");
    }
  }

  function groupByCategory(itemList: ShoppingItem[]) {
    const grouped = categories
      .map((category) => ({ category, items: itemList.filter((i) => i.category === category) }))
      .filter((group) => group.items.length > 0);
    // A leftover item whose category no longer exists in the family's current
    // list (e.g. a parent removed/renamed a category after it was used)
    // still needs somewhere to show up, instead of silently disappearing.
    const uncategorized = itemList.filter((i) => !categories.includes(i.category));
    if (uncategorized.length > 0) grouped.push({ category: "Ostatní", items: uncategorized });
    return grouped;
  }

  const activeItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);
  const activeByCategory = groupByCategory(activeItems);
  const checkedByCategory = groupByCategory(checkedItems);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nákupní seznam</h1>
          <p className="text-sm text-zinc-500">Přidat i odškrtnout může kdokoli z rodiny.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <Plus size={16} /> Přidat
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              required
              autoFocus
              placeholder="Co koupit?"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
            />
            <input
              type="text"
              placeholder="Množství"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
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
          <ShoppingCart size={40} />
          <p className="text-lg">Seznam je prázdný.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {activeByCategory.map(({ category, items: groupItems }) => (
            <section key={category} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-500">{category}</h2>
              <div className="flex flex-col gap-1.5">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChecked(item)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-300"
                      aria-label="Odškrtnout jako koupené"
                    />
                    <p className="min-w-0 flex-1 truncate">
                      {item.name}
                      {item.quantity && <span className="text-zinc-500"> · {item.quantity}</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      aria-label="Odebrat"
                      className="shrink-0 text-zinc-400 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {checkedItems.length > 0 && (
            <div className="flex flex-col gap-5 border-t border-border pt-4">
              <h2 className="-mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Odškrtnuté ({checkedItems.length})
              </h2>
              {checkedByCategory.map(({ category, items: groupItems }) => (
                <section key={category} className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-zinc-500">{category}</h3>
                  <div className="flex flex-col gap-1.5">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecked(item)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent"
                          aria-label="Vrátit zpět na seznam"
                        />
                        <p className="min-w-0 flex-1 truncate text-zinc-400 line-through">
                          {item.name}
                          {item.quantity && <span> · {item.quantity}</span>}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          aria-label="Odebrat"
                          className="shrink-0 text-zinc-400 hover:text-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
