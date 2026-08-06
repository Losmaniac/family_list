"use client";

import { useState } from "react";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { INVESTMENT_TERMS, type InvestmentTerm } from "@/lib/investments";
import type { InvestmentTermConfig } from "@/lib/types";

interface EditableTerm {
  days: string;
  ratePercent: string;
  label: string;
}

function toEditable(terms: InvestmentTerm[]): EditableTerm[] {
  return terms.map((t) => ({ days: String(t.days), ratePercent: String(Math.round(t.rate * 1000) / 10), label: t.label }));
}

export default function InvestmentSettingsPanel({
  familyId,
  enabled,
  customTerms,
}: {
  familyId: string;
  enabled: boolean;
  customTerms?: InvestmentTermConfig[];
}) {
  const toast = useToast();
  const [savingToggle, setSavingToggle] = useState(false);
  const [editing, setEditing] = useState(false);
  const [terms, setTerms] = useState<EditableTerm[]>(() =>
    toEditable(customTerms && customTerms.length > 0 ? customTerms : INVESTMENT_TERMS)
  );
  const [savingTerms, setSavingTerms] = useState(false);

  async function handleToggleEnabled() {
    setSavingToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { investmentsEnabled: !enabled });
    } catch {
      toast.error("Nepodařilo se změnit nastavení investic.");
    } finally {
      setSavingToggle(false);
    }
  }

  function startEditing() {
    setTerms(toEditable(customTerms && customTerms.length > 0 ? customTerms : INVESTMENT_TERMS));
    setEditing(true);
  }

  function updateTerm(index: number, patch: Partial<EditableTerm>) {
    setTerms((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTerm() {
    setTerms((prev) => [...prev, { days: "14", ratePercent: "5", label: "" }]);
  }

  function removeTerm(index: number) {
    setTerms((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveTerms() {
    if (terms.length === 0) {
      toast.error("Musí zůstat alespoň jedna doba investice.");
      return;
    }
    const parsed: InvestmentTermConfig[] = [];
    for (const t of terms) {
      const days = Number(t.days);
      const ratePercent = Number(t.ratePercent);
      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        toast.error("Doba investice musí být 1–3650 dní.");
        return;
      }
      if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 500) {
        toast.error("Úrok musí být 0–500 %.");
        return;
      }
      if (!t.label.trim()) {
        toast.error("Každá doba potřebuje název.");
        return;
      }
      parsed.push({ days: Math.round(days), rate: ratePercent / 100, label: t.label.trim() });
    }

    setSavingTerms(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { investmentTerms: parsed });
      toast.success("Sazby investic uloženy.");
      setEditing(false);
    } catch {
      toast.error("Sazby se nepodařilo uložit.");
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleResetTerms() {
    setSavingTerms(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { investmentTerms: deleteField() });
      toast.success("Sazby obnoveny na výchozí.");
      setTerms(toEditable(INVESTMENT_TERMS));
      setEditing(false);
    } catch {
      toast.error("Nepodařilo se obnovit výchozí sazby.");
    } finally {
      setSavingTerms(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} disabled={savingToggle} onChange={handleToggleEnabled} />
        Povolit kartu Investice
      </label>

      {enabled && !editing && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
            {(customTerms && customTerms.length > 0 ? customTerms : INVESTMENT_TERMS).map((t) => (
              <span key={t.label} className="rounded-full border border-border px-3 py-1">
                {t.label} · +{Math.round(t.rate * 100)}%
              </span>
            ))}
          </div>
          <button type="button" onClick={startEditing} className="self-start text-sm font-semibold text-accent">
            Upravit sazby
          </button>
        </div>
      )}

      {enabled && editing && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          {terms.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Název"
                value={t.label}
                onChange={(e) => updateTerm(i, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                min={1}
                placeholder="dní"
                value={t.days}
                onChange={(e) => updateTerm(i, { days: e.target.value })}
                className="w-20 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  placeholder="%"
                  value={t.ratePercent}
                  onChange={(e) => updateTerm(i, { ratePercent: e.target.value })}
                  className="w-16 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
              <button type="button" onClick={() => removeTerm(i)} className="shrink-0 text-danger" aria-label="Smazat dobu">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTerm}
            className="flex items-center gap-1 self-start text-sm font-semibold text-accent"
          >
            <Plus size={14} /> Přidat dobu
          </button>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveTerms}
              disabled={savingTerms}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit sazby
            </button>
            <button
              type="button"
              onClick={handleResetTerms}
              disabled={savingTerms}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Obnovit výchozí
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
