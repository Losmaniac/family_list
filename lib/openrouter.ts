/**
 * Client-side helpers for OpenRouter's free, keyless model catalog
 * (openrouter.ai/api/v1/models) — CORS-enabled, no API key needed just to
 * list what's available, so the model picker in Settings fetches this
 * directly from the browser. The key itself is only ever needed for
 * actual generation, which happens server-side (functions/src/aiQuiz.ts).
 */

export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface OpenRouterModel {
  id: string;
  name: string;
  free: boolean;
}

interface RawModel {
  id?: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
}

export function parseOpenRouterModels(raw: unknown): OpenRouterModel[] {
  const rows = (raw as { data?: RawModel[] } | undefined)?.data;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((m): m is RawModel & { id: string; name: string } => typeof m.id === "string" && typeof m.name === "string")
    .map((m) => ({
      id: m.id,
      name: m.name,
      free: m.pricing?.prompt === "0" && m.pricing?.completion === "0",
    }));
}
