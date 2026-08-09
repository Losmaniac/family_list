"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { effectiveShoppingCategories } from "@/lib/shopping";

export default function ShoppingSettingsPanel({
  familyId,
  shoppingCategories,
}: {
  familyId: string;
  shoppingCategories?: string[];
}) {
  const toast = useToast();
  const categories = effectiveShoppingCategories(shoppingCategories);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveCategories(next: string[]) {
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { shoppingCategories: next });
    } catch {
      toast.error("Nepodařilo se uložit kategorie.");
    } finally {
      setSaving(false);
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setNewCategory("");
    saveCategories([...categories, trimmed]);
  }

  function handleRemove(category: string) {
    saveCategories(categories.filter((c) => c !== category));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">Kategorie nákupního seznamu (kdo přidá položku, může si vybrat kteroukoli z nich).</p>
      <div className="flex flex-col gap-1.5">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm">
            {cat}
            <button
              type="button"
              onClick={() => handleRemove(cat)}
              disabled={saving}
              aria-label={`Odebrat kategorii ${cat}`}
              className="text-danger disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Nová kategorie"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !newCategory.trim()}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          Přidat
        </button>
      </form>
    </div>
  );
}
