"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Plus, X } from "lucide-react";
import { getDb, getFirebaseFunctions } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { formatXp } from "@/lib/xp-engine";
import { adHocCooldownInfo, formatCooldownRemaining, latestCompletionByType } from "@/lib/adhoc-tasks";
import type { AdHocTaskCompletion, AdHocTaskType } from "@/lib/types";

interface SubmitResponse {
  awarded: number;
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * "+" entry point for irregular ("jednorázové") tasks that don't fit the
 * daily schedule — e.g. emptying the dishwasher. Types are parent-defined
 * (Settings → Jednorázové úkoly); anyone can complete one here whenever
 * it's actually needed, as long as it isn't still on cooldown from the
 * last time someone did it.
 */
export default function AdHocTasksButton({ familyId }: { familyId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<AdHocTaskType[]>([]);
  const [completions, setCompletions] = useState<AdHocTaskCompletion[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "adHocTaskTypes"), (snapshot) => {
      setTypes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AdHocTaskType));
    });
  }, [familyId]);

  useEffect(() => {
    if (!open) return;
    const completionsQuery = query(
      collection(getDb(), "families", familyId, "adHocCompletions"),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    return onSnapshot(completionsQuery, (snapshot) => {
      setCompletions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AdHocTaskCompletion));
    });
  }, [familyId, open]);

  // Live countdown — only ticks while the modal is actually open.
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [open]);

  const latestByType = latestCompletionByType(completions);
  const activeTypes = types.filter((t) => t.active);

  async function handleComplete(type: AdHocTaskType) {
    setSubmittingId(type.id);
    try {
      const result = await httpsCallable<{ familyId: string; typeId: string }, SubmitResponse>(
        getFirebaseFunctions(),
        "completeAdHocTask"
      )({ familyId, typeId: type.id });
      toast.success(`Hotovo! +${formatXp(result.data.awarded)} XP`);
    } catch (err) {
      toast.error(describeError(err, "Úkol se nepodařilo splnit."));
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Jednorázový úkol"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-accent"
      >
        <Plus size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Jednorázové úkoly</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zavřít"
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>

            {activeTypes.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Rodič zatím nenastavil žádné jednorázové úkoly (Nastavení → Jednorázové úkoly).
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {activeTypes.map((type) => {
                  const cooldown = adHocCooldownInfo(type.cooldownMinutes, latestByType[type.id], now);
                  return (
                    <div
                      key={type.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{type.title}</p>
                        <p className="text-sm text-zinc-500">+{formatXp(type.xpValue)} XP</p>
                      </div>
                      {cooldown.onCooldown ? (
                        <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-sm text-zinc-500">
                          {formatCooldownRemaining(cooldown.remainingMs)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleComplete(type)}
                          disabled={submittingId === type.id}
                          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                        >
                          Splnit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
