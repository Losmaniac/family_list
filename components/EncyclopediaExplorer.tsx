"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, Layers, Search } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import {
  buildWikiCategoriesUrl,
  buildWikiCategoryMembersUrl,
  buildWikiFullExtractUrl,
  buildWikiSearchUrl,
  buildWikiSummaryUrl,
  parseOpenSearch,
  parseWikiCategories,
  parseWikiCategoryMembers,
  parseWikiFullExtract,
  parseWikiSummary,
  type WikiSummary,
} from "@/lib/wikipedia";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/**
 * Informational-only encyclopedia lookup (no XP) — Czech Wikipedia search +
 * summary, with two opt-in "want more?" paths for a curious kid: the full
 * article body (the REST summary endpoint only ever gives a short intro),
 * and the article's categories as tappable "topic area" chips, each of
 * which can be browsed into a list of other articles in that category.
 * Wikipedia's dedicated /page/related REST endpoint was decommissioned, so
 * categories are the closest stable stand-in for "related topics".
 */
export default function EncyclopediaExplorer() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [summary, setSummary] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [fullExtract, setFullExtract] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [categories, setCategories] = useState<string[] | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [categoryMembers, setCategoryMembers] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  function resetArticleExtras() {
    setFullExtract(null);
    setCategories(null);
    setOpenCategory(null);
    setCategoryMembers([]);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSummary(null);
    resetArticleExtras();
    try {
      const res = await fetch(buildWikiSearchUrl(query.trim()));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const results = parseOpenSearch(await res.json());
      setSuggestions(results.map((r) => r.title));
      if (results.length === 1) await openArticle(results[0].title);
    } catch (err) {
      toast.error(describeError(err, "Vyhledávání se nezdařilo."));
    } finally {
      setLoading(false);
    }
  }

  async function openArticle(title: string) {
    setLoading(true);
    setSuggestions([]);
    resetArticleExtras();
    try {
      const res = await fetch(buildWikiSummaryUrl(title));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(parseWikiSummary(await res.json()));
    } catch (err) {
      toast.error(describeError(err, "Článek se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!summary) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildWikiFullExtractUrl(summary.title));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const extract = parseWikiFullExtract(await res.json());
      setFullExtract(extract ?? summary.extract);
    } catch (err) {
      toast.error(describeError(err, "Celý článek se nepodařilo načíst."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleLoadCategories() {
    if (!summary) return;
    setLoadingCategories(true);
    try {
      const res = await fetch(buildWikiCategoriesUrl(summary.title));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories(parseWikiCategories(await res.json()));
    } catch (err) {
      toast.error(describeError(err, "Okruhy se nepodařilo načíst."));
    } finally {
      setLoadingCategories(false);
    }
  }

  async function handleOpenCategory(category: string) {
    setOpenCategory(category);
    setCategoryMembers([]);
    setLoadingMembers(true);
    try {
      const res = await fetch(buildWikiCategoryMembersUrl(`Kategorie:${category}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategoryMembers(parseWikiCategoryMembers(await res.json()));
    } catch (err) {
      toast.error(describeError(err, "Články v okruhu se nepodařilo načíst."));
    } finally {
      setLoadingMembers(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">Vyhledej pojem, osobnost nebo místo na Wikipedii.</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Např. Karel IV."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          <Search size={16} /> Hledat
        </button>
      </form>

      {loading && <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />}

      {!loading && suggestions.length > 1 && (
        <div className="flex flex-col gap-1.5">
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => openArticle(title)}
              className="rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {!loading && !summary && suggestions.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <BookOpen size={40} />
          <p className="text-lg">Vyhledej něco na Wikipedii.</p>
        </div>
      )}

      {!loading && summary && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            {summary.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain Wikipedia thumbnail, not a static asset
              <img src={summary.thumbnail} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-semibold">{summary.title}</p>
              <p className="whitespace-pre-line text-sm text-zinc-500">{fullExtract ?? summary.extract}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!fullExtract && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronDown size={14} /> {loadingMore ? "Načítám…" : "Zobrazit více"}
              </button>
            )}
            {!categories && (
              <button
                type="button"
                onClick={handleLoadCategories}
                disabled={loadingCategories}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <Layers size={14} /> {loadingCategories ? "Načítám…" : "Zobrazit okruhy"}
              </button>
            )}
            {summary.pageUrl && (
              <a
                href={summary.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 self-center text-sm font-semibold text-accent"
              >
                Otevřít na Wikipedii <ExternalLink size={14} />
              </a>
            )}
          </div>

          {categories && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {categories.length === 0 ? (
                <p className="text-sm text-zinc-500">K tomuto pojmu nejsou žádné okruhy.</p>
              ) : (
                <>
                  <p className="text-xs font-medium text-zinc-500">Související okruhy — klepnutím zobrazíš další pojmy</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleOpenCategory(category)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          openCategory === category ? "border-accent bg-accent/10 text-accent" : "border-border"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {openCategory && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {loadingMembers ? (
                    <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
                  ) : categoryMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">V tomto okruhu nejsou žádné další pojmy.</p>
                  ) : (
                    categoryMembers
                      .filter((title) => title !== summary.title)
                      .map((title) => (
                        <button
                          key={title}
                          type="button"
                          onClick={() => openArticle(title)}
                          className="rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        >
                          {title}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
