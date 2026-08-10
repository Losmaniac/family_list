/**
 * Shared "call whichever AI provider a family has configured" logic, used
 * by both aiQuiz.ts (question generation) and weeklyDigest.ts (the weekly
 * recap). A family can configure either (or both) of two providers in
 * Settings — Gemini, or OpenRouter (a router that fronts many models,
 * several with a free tier) — each key stored server-only in
 * families/{familyId}/secrets/{gemini,openrouter}, never read back to any
 * client, same trust boundary as everything else money/credential-shaped
 * in this app.
 *
 * generateWithFallback always tries Gemini first when configured (it's the
 * family's own Google API key). If Gemini isn't configured, or it
 * fails/returns something the caller's `parse` rejects (quota, transient
 * error, malformed output, ...), it falls back to OpenRouter — starting
 * with the family's saved model, then automatically cycling through
 * OpenRouter's free-tier catalog (fetched live, cached briefly) — until one
 * attempt actually produces a valid result, or the attempt budget runs out.
 */
import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import { OPENROUTER_MODELS_URL, parseOpenRouterModels } from "../../lib/openrouter";

const GEMINI_MODEL = "gemini-2.0-flash";

export interface AiSecrets {
  gemini?: { apiKey?: string };
  openRouter?: { apiKey?: string; model?: string };
}

export async function loadAiSecrets(db: Firestore, familyId: string): Promise<AiSecrets> {
  const familyRef = db.collection("families").doc(familyId);
  const [openRouterSnap, geminiSnap] = await Promise.all([
    familyRef.collection("secrets").doc("openrouter").get(),
    familyRef.collection("secrets").doc("gemini").get(),
  ]);
  return {
    gemini: geminiSnap.data() as { apiKey?: string } | undefined,
    openRouter: openRouterSnap.data() as { apiKey?: string; model?: string } | undefined,
  };
}

// Cheap module-level cache so a burst of calls doesn't re-fetch OpenRouter's
// full model catalog every time.
let freeOpenRouterModelsCache: { ids: string[]; fetchedAt: number } | null = null;
const FREE_MODELS_CACHE_TTL_MS = 10 * 60 * 1000;

async function getFreeOpenRouterModelIds(): Promise<string[]> {
  if (freeOpenRouterModelsCache && Date.now() - freeOpenRouterModelsCache.fetchedAt < FREE_MODELS_CACHE_TTL_MS) {
    return freeOpenRouterModelsCache.ids;
  }
  try {
    const res = await fetch(OPENROUTER_MODELS_URL);
    if (!res.ok) return freeOpenRouterModelsCache?.ids ?? [];
    const ids = parseOpenRouterModels(await res.json())
      .filter((m) => m.free)
      .map((m) => m.id);
    freeOpenRouterModelsCache = { ids, fetchedAt: Date.now() };
    return ids;
  } catch {
    return freeOpenRouterModelsCache?.ids ?? [];
  }
}

const MAX_OPENROUTER_MODEL_ATTEMPTS = 5;

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (res.status === 400 || res.status === 403) {
    throw new HttpsError("failed-precondition", "API klíč pro Gemini se zdá být neplatný — zkontroluj ho v Nastavení.");
  }
  if (res.status === 429) {
    // Gemini's free tier has a low per-minute/per-day request quota — this
    // is expected under normal family use, not a bug. generateWithFallback
    // already falls back to OpenRouter automatically when this happens, so
    // this message only ever reaches the caller if OpenRouter also isn't
    // configured or exhausted the fallback list too.
    throw new HttpsError(
      "resource-exhausted",
      "Gemini má vyčerpaný bezplatný limit dotazů na dnes/tuto minutu — zkus to za chvíli znovu, nebo nastav v Nastavení i OpenRouter jako druhou možnost."
    );
  }
  if (!res.ok) {
    throw new HttpsError("unavailable", `Gemini je momentálně nedostupné (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new HttpsError("internal", "Neplatná odpověď od AI.");
  return text;
}

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new HttpsError("failed-precondition", "API klíč pro OpenRouter se zdá být neplatný — zkontroluj ho v Nastavení.");
  }
  if (res.status === 429) {
    throw new HttpsError("resource-exhausted", "Zvolený model na OpenRouter má vyčerpaný limit dotazů — zkus to za chvíli znovu, nebo v Nastavení vyber jiný model.");
  }
  if (!res.ok) {
    throw new HttpsError("unavailable", `OpenRouter je momentálně nedostupný (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new HttpsError("internal", "Neplatná odpověď od AI.");
  return text;
}

/**
 * Tries Gemini first, then OpenRouter — starting with the family's saved
 * model, then working through OpenRouter's free-tier catalog — stopping as
 * soon as `parse` accepts a result. Individual provider/model failures
 * (quota, invalid key, malformed output, a `parse` rejection, ...) are
 * swallowed here so the caller only ever sees "nothing worked" as a single
 * outcome (`null`).
 */
export async function generateWithFallback<T>(secrets: AiSecrets, prompt: string, parse: (raw: string) => T | null): Promise<T | null> {
  if (secrets.gemini?.apiKey) {
    try {
      const parsed = parse(await callGemini(secrets.gemini.apiKey, prompt));
      if (parsed) return parsed;
    } catch {
      // fall through to OpenRouter
    }
  }

  if (secrets.openRouter?.apiKey) {
    const candidateModels = [...new Set([secrets.openRouter.model, ...(await getFreeOpenRouterModelIds())].filter((m): m is string => !!m))].slice(
      0,
      MAX_OPENROUTER_MODEL_ATTEMPTS
    );
    for (const model of candidateModels) {
      try {
        const parsed = parse(await callOpenRouter(secrets.openRouter.apiKey, model, prompt));
        if (parsed) return parsed;
      } catch {
        // try the next model
      }
    }
  }

  return null;
}
