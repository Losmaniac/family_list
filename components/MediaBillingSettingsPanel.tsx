"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { DEFAULT_MEDIA_GRACE_PERIOD_MINUTES, MEDIA_XP_COST_PER_BLOCK } from "@/lib/media-billing";
import type { Family } from "@/lib/types";

/** Lets a parent tune when Rádio/TV listening starts costing XP, and how much — see lib/media-billing.ts for the underlying schedule (a fixed 5-minute block length isn't configurable, just the grace period and the per-block rate). */
export default function MediaBillingSettingsPanel({
  familyId,
  mediaGracePeriodMinutes,
  mediaXpCostPerBlock,
}: {
  familyId: string;
  mediaGracePeriodMinutes?: Family["mediaGracePeriodMinutes"];
  mediaXpCostPerBlock?: Family["mediaXpCostPerBlock"];
}) {
  const toast = useToast();
  const [graceInput, setGraceInput] = useState(String(mediaGracePeriodMinutes ?? DEFAULT_MEDIA_GRACE_PERIOD_MINUTES));
  const [radioInput, setRadioInput] = useState(String(mediaXpCostPerBlock?.radio ?? MEDIA_XP_COST_PER_BLOCK.radio));
  const [tvInput, setTvInput] = useState(String(mediaXpCostPerBlock?.tv ?? MEDIA_XP_COST_PER_BLOCK.tv));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const grace = Number(graceInput);
    const radio = Number(radioInput);
    const tv = Number(tvInput);
    if (!Number.isFinite(grace) || grace < 0 || !Number.isFinite(radio) || radio < 0 || !Number.isFinite(tv) || tv < 0) {
      toast.error("Zadej platná čísla 0 nebo víc.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        mediaGracePeriodMinutes: grace,
        mediaXpCostPerBlock: { radio, tv },
      });
      toast.success("Nastavení uloženo.");
    } catch {
      toast.error("Nepodařilo se uložit nastavení.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        mediaGracePeriodMinutes: deleteField(),
        mediaXpCostPerBlock: deleteField(),
      });
      setGraceInput(String(DEFAULT_MEDIA_GRACE_PERIOD_MINUTES));
      setRadioInput(String(MEDIA_XP_COST_PER_BLOCK.radio));
      setTvInput(String(MEDIA_XP_COST_PER_BLOCK.tv));
      toast.success("Nastavení obnoveno na výchozí.");
    } catch {
      toast.error("Nepodařilo se obnovit výchozí hodnoty.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        Po jak dlouhé době poslechu/sledování se začne strhávat XP, a kolik XP stojí každých dalších započatých 5 minut.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-zinc-500">Zdarma prvních</label>
        <input
          type="number"
          min={0}
          value={graceInput}
          onChange={(e) => setGraceInput(e.target.value)}
          className="w-20 rounded-lg border border-border bg-surface px-3 py-2"
        />
        <span className="text-sm text-zinc-500">min</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="w-16 text-sm text-zinc-500">Rádio</label>
        <input
          type="number"
          min={0}
          value={radioInput}
          onChange={(e) => setRadioInput(e.target.value)}
          className="w-20 rounded-lg border border-border bg-surface px-3 py-2"
        />
        <span className="text-sm text-zinc-500">XP / 5 min</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="w-16 text-sm text-zinc-500">TV</label>
        <input
          type="number"
          min={0}
          value={tvInput}
          onChange={(e) => setTvInput(e.target.value)}
          className="w-20 rounded-lg border border-border bg-surface px-3 py-2"
        />
        <span className="text-sm text-zinc-500">XP / 5 min</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          Uložit
        </button>
        <button type="button" onClick={handleReset} disabled={saving} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50">
          Obnovit výchozí
        </button>
      </div>
    </div>
  );
}
