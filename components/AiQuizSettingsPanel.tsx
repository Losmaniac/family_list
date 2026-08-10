"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/**
 * Parent-only: enter a Gemini API key (free from Google AI Studio) so
 * "AI otázky" in Vzdělání can generate questions. The key is submitted
 * once and stored server-only (families/{familyId}/secrets/gemini) — this
 * component never reads it back, only whether one is configured.
 */
export default function AiQuizSettingsPanel({ familyId, configured }: { familyId: string; configured: boolean }) {
  const toast = useToast();
  const [editing, setEditing] = useState(!configured);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (apiKey.trim().length < 10) {
      toast.error("Zadej platný API klíč.");
      return;
    }
    setSaving(true);
    try {
      await httpsCallable<{ familyId: string; apiKey: string }, { configured: boolean }>(getFirebaseFunctions(), "setGeminiApiKey")({
        familyId,
        apiKey: apiKey.trim(),
      });
      toast.success("API klíč uložen.");
      setApiKey("");
      setEditing(false);
    } catch (err) {
      toast.error(describeError(err, "Klíč se nepodařilo uložit."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">
        Zdarma z{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google AI Studio
        </a>
        . Klíč se použije jen na serveru pro generování otázek v sekci &bdquo;AI otázky&ldquo; ve Vzdělání — děti ho
        nikde neuvidí.
      </p>

      {!editing ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-success">✓ Klíč je nastaven</p>
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-accent">
            Změnit
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit
          </button>
          {configured && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Zrušit
            </button>
          )}
        </form>
      )}
    </div>
  );
}
