"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { ChefHat, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { dateKeyInFamilyZone, addDays, startOfWeek } from "@/lib/date-utils";
import { aggregateIngredients, parseIngredientLines } from "@/lib/meal-plan";
import { clampQuantity } from "@/lib/shopping";
import type { MealPlan, Recipe } from "@/lib/types";

function emptyRecipeForm() {
  return { title: "", ingredients: "" };
}

/** Next Monday's date key — the week a parent is planning meals for, one week out from whichever day this loads. */
function nextWeekKey(): string {
  return dateKeyInFamilyZone(startOfWeek(addDays(new Date(), 7)));
}

/**
 * "Jídelníček" tab on /lists — a parent picks recipes to cook next week
 * (families/{familyId}/mealPlan/{weekKey}); a "Vygenerovat nákupní seznam"
 * step aggregates every selected recipe's ingredients (lib/meal-plan.ts),
 * shows them as a checklist defaulted to "buy this" so the parent can
 * uncheck whatever's already at home, then adds only what's still checked
 * to the existing shoppingItems collection (untouched — same shape any
 * other shopping-list item already uses).
 */
export default function MealPlannerView({
  familyId,
  isParent,
}: {
  familyId: string;
  isParent: boolean;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();

  const weekKey = useMemo(() => nextWeekKey(), []);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [planLoaded, setPlanLoaded] = useState(false);

  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm());
  const [submitting, setSubmitting] = useState(false);

  const [reviewIngredients, setReviewIngredients] = useState<
    { name: string; count: number; wanted: boolean }[] | null
  >(null);
  const [addingToShoppingList, setAddingToShoppingList] = useState(false);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "families", familyId, "recipes"),
      (snap) => {
        setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recipe));
      },
    );
  }, [familyId]);

  useEffect(() => {
    return onSnapshot(
      doc(getDb(), "families", familyId, "mealPlan", weekKey),
      (snap) => {
        const data = snap.exists()
          ? ({ id: snap.id, ...snap.data() } as MealPlan)
          : null;
        setPlan(data);
        setSelectedIds(new Set(data?.recipeIds ?? []));
        setPlanLoaded(true);
      },
    );
  }, [familyId, weekKey]);

  function toggleSelected(recipeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  async function handleSavePlan() {
    if (!user) return;
    try {
      await setDoc(
        doc(getDb(), "families", familyId, "mealPlan", weekKey),
        {
          recipeIds: [...selectedIds],
          createdBy: plan?.createdBy ?? user.uid,
          createdAt: plan?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        } satisfies Omit<MealPlan, "id">,
        { merge: true },
      );
      toast.success("Jídelníček na příští týden uložen.");
    } catch {
      toast.error("Nepodařilo se uložit.");
    }
  }

  async function handleAddRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !recipeForm.title.trim()) return;
    const ingredients = parseIngredientLines(recipeForm.ingredients);
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "recipes"), {
        title: recipeForm.title.trim(),
        ingredients,
        createdBy: user.uid,
        createdAt: Date.now(),
      });
      setRecipeForm(emptyRecipeForm());
      setShowRecipeForm(false);
    } catch {
      toast.error("Recept se nepodařilo uložit.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRecipe(recipe: Recipe) {
    const ok = await confirm({
      title: `Smazat recept „${recipe.title}“?`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "recipes", recipe.id));
    } catch {
      toast.error("Recept se nepodařilo smazat.");
    }
  }

  function handleOpenReview() {
    const selectedRecipes = recipes.filter((r) => selectedIds.has(r.id));
    if (selectedRecipes.length === 0) {
      toast.error("Nejdřív vyber aspoň jedno jídlo.");
      return;
    }
    setReviewIngredients(
      aggregateIngredients(selectedRecipes).map((i) => ({
        ...i,
        wanted: true,
      })),
    );
  }

  function toggleWanted(index: number) {
    setReviewIngredients(
      (prev) =>
        prev?.map((item, i) =>
          i === index ? { ...item, wanted: !item.wanted } : item,
        ) ?? null,
    );
  }

  async function handleConfirmShoppingList() {
    if (!reviewIngredients || !user) return;
    const toAdd = reviewIngredients.filter((i) => i.wanted);
    if (toAdd.length === 0) {
      setReviewIngredients(null);
      return;
    }
    setAddingToShoppingList(true);
    try {
      await Promise.all(
        toAdd.map((item) =>
          addDoc(collection(getDb(), "families", familyId, "shoppingItems"), {
            name: item.name,
            quantity: clampQuantity(item.count),
            category: "Ostatní",
            checked: false,
            addedBy: user.uid,
            timestamp: Date.now(),
          }),
        ),
      );
      toast.success(`Přidáno ${toAdd.length} položek do nákupního seznamu.`);
      setReviewIngredients(null);
    } catch {
      toast.error("Nepodařilo se přidat do nákupního seznamu.");
    } finally {
      setAddingToShoppingList(false);
    }
  }

  if (reviewIngredients) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-medium">Co už doma máš?</h2>
          <p className="text-sm text-zinc-500">
            Odškrtni suroviny, které už máš — zbytek přidáme do nákupního
            seznamu.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {reviewIngredients.map((item, i) => (
            <button
              key={item.name}
              type="button"
              onClick={() => toggleWanted(i)}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left ${
                item.wanted
                  ? "border-border bg-surface"
                  : "border-border bg-surface-muted text-zinc-400 line-through"
              }`}
            >
              <span>{item.name}</span>
              {item.count > 1 && (
                <span className="shrink-0 text-xs">×{item.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmShoppingList}
            disabled={addingToShoppingList}
            className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            <ShoppingCart size={16} /> Přidat do nákupního seznamu
          </button>
          <button
            type="button"
            onClick={() => setReviewIngredients(null)}
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
          >
            Zpět
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium">Příští týden</h2>
        <p className="text-sm text-zinc-500">
          Vyber, co se bude vařit — ze suroviny pak snadno naplníš nákupní
          seznam.
        </p>
      </div>

      {isParent && !showRecipeForm && (
        <button
          type="button"
          onClick={() => setShowRecipeForm(true)}
          className="flex shrink-0 items-center gap-1 self-start rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          <Plus size={16} /> Nový recept
        </button>
      )}

      {isParent && showRecipeForm && (
        <form
          onSubmit={handleAddRecipe}
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <input
            type="text"
            required
            autoFocus
            placeholder="Název jídla"
            value={recipeForm.title}
            onChange={(e) =>
              setRecipeForm((prev) => ({ ...prev, title: e.target.value }))
            }
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <textarea
            placeholder={
              "Suroviny, jedna na řádek\nnapř.\nVejce\nMouka 500 g\nMléko"
            }
            value={recipeForm.ingredients}
            onChange={(e) =>
              setRecipeForm((prev) => ({
                ...prev,
                ingredients: e.target.value,
              }))
            }
            rows={5}
            className="resize-none rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !recipeForm.title.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
            </button>
            <button
              type="button"
              onClick={() => setShowRecipeForm(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {recipes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <ChefHat size={40} />
          <p className="text-lg">Zatím žádné recepty.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-2.5"
            >
              <button
                type="button"
                onClick={() => isParent && toggleSelected(recipe.id)}
                disabled={!isParent}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selectedIds.has(recipe.id)
                    ? "border-accent bg-accent"
                    : "border-zinc-300"
                }`}
                aria-label={
                  selectedIds.has(recipe.id)
                    ? "Odebrat z plánu"
                    : "Přidat do plánu"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{recipe.title}</p>
                {recipe.ingredients.length > 0 && (
                  <p className="truncate text-xs text-zinc-500">
                    {recipe.ingredients.join(", ")}
                  </p>
                )}
              </div>
              {isParent && (
                <button
                  type="button"
                  onClick={() => handleDeleteRecipe(recipe)}
                  aria-label="Smazat recept"
                  className="shrink-0 text-zinc-400 hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isParent && planLoaded && recipes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSavePlan}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Uložit výběr
          </button>
          <button
            type="button"
            onClick={handleOpenReview}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            <ShoppingCart size={16} /> Vygenerovat nákupní seznam
          </button>
        </div>
      )}
    </div>
  );
}
