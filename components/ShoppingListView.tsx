"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ChevronDown, ChevronRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { clampQuantity, effectiveShoppingCategories, SHOPPING_MIN_QUANTITY } from "@/lib/shopping";
import { formatCompletedAt } from "@/lib/lists";
import type { ShoppingItem } from "@/lib/types";

function emptyForm(defaultCategory: string) {
  return { name: "", quantity: SHOPPING_MIN_QUANTITY, category: defaultCategory };
}

/** Module-scope (not component-body) so Date.now() here isn't subject to the react-compiler's render-purity analysis. */
function nowMs(): number {
  return Date.now();
}

/** Compact inline -/+ stepper — never opens a dialog, every click writes straight through onChange. */
function QuantityStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(clampQuantity(value - 1))}
        aria-label="Ubrat kus"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-zinc-500"
      >
        <Minus size={12} />
      </button>
      <span className="w-4 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(clampQuantity(value + 1))}
        aria-label="Přidat kus"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-zinc-500"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

/** The "Nákupní seznam" tab of the Seznamy card — backed by the (unchanged) top-level shoppingItems collection. */
export default function ShoppingListView() {
  const { user } = useAuth();
  const { familyId, family } = useFamily();
  const toast = useToast();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const categories = effectiveShoppingCategories(family?.shoppingCategories);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => emptyForm(categories[0]));
  const [submitting, setSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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
        quantity: form.quantity,
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
    const next = !item.checked;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "shoppingItems", item.id), {
        checked: next,
        completedAt: next ? nowMs() : null,
      });
    } catch {
      toast.error("Nepodařilo se uložit změnu.");
    }
  }

  async function handleQuantityChange(item: ShoppingItem, next: number) {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "shoppingItems", item.id), { quantity: next });
    } catch {
      toast.error("Nepodařilo se uložit množství.");
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
            <QuantityStepper value={form.quantity} onChange={(next) => setForm((prev) => ({ ...prev, quantity: next }))} />
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
                    <p className="min-w-0 flex-1 truncate">{item.name}</p>
                    <QuantityStepper
                      value={item.quantity ?? SHOPPING_MIN_QUANTITY}
                      onChange={(next) => handleQuantityChange(item, next)}
                    />
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
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowCompleted((prev) => !prev)}
                className="-mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-400"
              >
                {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Dokončené ({checkedItems.length})
              </button>
              {showCompleted &&
                checkedByCategory.map(({ category, items: groupItems }) => (
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
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-zinc-400 line-through">
                              {item.name}
                              {item.quantity && <span> · {item.quantity}</span>}
                            </p>
                            {formatCompletedAt(item.completedAt) && (
                              <p className="text-xs text-zinc-400">{formatCompletedAt(item.completedAt)}</p>
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
