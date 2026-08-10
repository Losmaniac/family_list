"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { formatContextLength, OPENROUTER_MODELS_URL, parseOpenRouterModels, type OpenRouterModel } from "@/lib/openrouter";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/**
 * Parent-only: enter an OpenRouter API key and pick which model "AI
 * otázky" should use. The model catalog (openrouter.ai/api/v1/models) is
 * public and keyless, so it's fetched straight from the browser the
 * moment the key is pasted — the key itself is only needed once actual
 * generation happens, server-side, and is stored the same way as the
 * Gemini key (families/{familyId}/secrets/openrouter, never read back to
 * any client).
 */
export default function OpenRouterSettingsPanel({
  familyId,
  configured,
  currentModel,
}: {
  familyId: string;
  configured: boolean;
  currentModel?: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(!configured);
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [filter, setFilter] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedModel, setSelectedModel] = useState(currentModel ?? "");
  const [saving, setSaving] = useState(false);

  async function handleLoadModels() {
    setLoadingModels(true);
    try {
      const res = await fetch(OPENROUTER_MODELS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = parseOpenRouterModels(await res.json());
      if (parsed.length === 0) throw new Error("Prázdný seznam modelů");
      setModels(parsed);
    } catch (err) {
      toast.error(describeError(err, "Seznam modelů se nepodařilo načíst."));
    } finally {
      setLoadingModels(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (apiKey.trim().length < 10 || !selectedModel) {
      toast.error("Zadej platný API klíč a vyber model.");
      return;
    }
    setSaving(true);
    try {
      await httpsCallable<{ familyId: string; apiKey: string; model: string }, { configured: boolean }>(
        getFirebaseFunctions(),
        "setOpenRouterConfig"
      )({ familyId, apiKey: apiKey.trim(), model: selectedModel });
      toast.success("OpenRouter nastaven.");
      setApiKey("");
      setEditing(false);
    } catch (err) {
      toast.error(describeError(err, "Nastavení se nepodařilo uložit."));
    } finally {
      setSaving(false);
    }
  }

  const filteredModels = models
    .filter((m) => !freeOnly || m.free)
    .filter((m) => !filter.trim() || m.name.toLowerCase().includes(filter.trim().toLowerCase()) || m.id.toLowerCase().includes(filter.trim().toLowerCase()))
    .slice(0, 60);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">
        Zdarma z{" "}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">
          OpenRouter
        </a>{" "}
        — jeden klíč, přístup k mnoha modelům (několik zdarma). Pro &bdquo;AI otázky&ldquo; se vždy nejdřív zkusí
        Gemini; pokud otázku nevygeneruje (limit, výpadek…), automaticky se přeskočí na tento vybraný model a pak na
        další zdarma dostupné modely z OpenRouter, dokud se otázka nepovede vygenerovat.
      </p>

      {!editing ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-success">✓ Nastaveno{currentModel ? ` — ${currentModel}` : ""}</p>
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-accent">
            Změnit
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
            />
            <button
              type="button"
              onClick={handleLoadModels}
              disabled={loadingModels}
              className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {loadingModels ? "Načítám…" : "Načíst modely"}
            </button>
          </div>

          {models.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Hledat model…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                  <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
                  jen zdarma
                </label>
              </div>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
                {filteredModels.length === 0 ? (
                  <p className="p-2 text-sm text-zinc-500">Nic nenalezeno.</p>
                ) : (
                  filteredModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm ${
                        selectedModel === m.id ? "bg-accent text-accent-foreground" : "hover:bg-surface-muted"
                      }`}
                    >
                      <span className="min-w-0 truncate">{m.name}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {m.contextLength && (
                          <span className="text-xs opacity-70" title="Velikost kontextového okna — nejbližší dostupné vodítko k síle modelu, OpenRouter neuvádí počet parametrů">
                            {formatContextLength(m.contextLength)} ctx
                          </span>
                        )}
                        {m.free && <span className="text-xs opacity-80">zdarma</span>}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {selectedModel && <p className="text-xs text-zinc-500">Vybráno: {selectedModel}</p>}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !selectedModel}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
            </button>
            {configured && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                Zrušit
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
