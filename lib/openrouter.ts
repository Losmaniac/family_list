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
  /** Context window in tokens, if the catalog reports one — OpenRouter has no
   * parameter-count/"intelligence" field (proprietary models like GPT-4o or
   * Claude never state one), so this is the closest structured proxy for a
   * model's size/capability that's actually available. */
  contextLength: number | null;
}

interface RawModel {
  id?: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
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
      contextLength: typeof m.context_length === "number" && m.context_length > 0 ? m.context_length : null,
    }));
}

export function formatContextLength(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return `${tokens}`;
}
