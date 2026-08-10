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

type Mode = "view" | "model" | "key";

/**
 * Parent-only: enter an OpenRouter API key and pick which model "AI
 * otázky" should use. The model catalog (openrouter.ai/api/v1/models) is
 * public and keyless, so it's fetched straight from the browser as soon as
 * the picker opens — no key needed for that part. The key itself is only
 * needed once actual generation happens, server-side, and is stored the
 * same way as the Gemini key (families/{familyId}/secrets/openrouter,
 * never read back to any client).
 *
 * Once a key is on file, switching models doesn't need it re-pasted:
 * "model" mode calls setOpenRouterConfig with just {familyId, model} — the
 * function reuses the already-stored key. "key" mode is the full form,
 * used for first-time setup or an explicit key change.
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
  const [mode, setMode] = useState<Mode>(configured ? "view" : "key");
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

  function openModelPicker() {
    setMode("model");
    if (models.length === 0) handleLoadModels();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "key" && apiKey.trim().length < 10) {
      toast.error("Zadej platný API klíč.");
      return;
    }
    if (!selectedModel) {
      toast.error("Vyber model.");
      return;
    }
    setSaving(true);
    try {
      const payload: { familyId: string; apiKey?: string; model: string } = { familyId, model: selectedModel };
      if (mode === "key") payload.apiKey = apiKey.trim();
      await httpsCallable<typeof payload, { configured: boolean }>(getFirebaseFunctions(), "setOpenRouterConfig")(payload);
      toast.success(mode === "key" ? "OpenRouter nastaven." : "Model změněn.");
      setApiKey("");
      setMode("view");
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

      {mode === "view" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-success">✓ Nastaveno{currentModel ? ` — ${currentModel}` : ""}</p>
          <button type="button" onClick={openModelPicker} className="text-sm font-semibold text-accent">
            Rychlá změna modelu
          </button>
          <button type="button" onClick={() => setMode("key")} className="text-sm font-semibold text-zinc-500">
            Změnit klíč
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          {mode === "key" && (
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
          )}

          {mode === "model" && loadingModels && models.length === 0 && (
            <p className="text-sm text-zinc-500">Načítám modely…</p>
          )}

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
                onClick={() => setMode("view")}
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
