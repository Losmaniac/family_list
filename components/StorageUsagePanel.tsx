"use client";

import { useState } from "react";
import { getMetadata, listAll, ref as storageRef } from "firebase/storage";
import { HardDrive, RefreshCw } from "lucide-react";
import { getFirebaseStorage } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { FIREBASE_STORAGE_FREE_TIER_GB, formatBytes, storageUsagePercent } from "@/lib/storage-usage";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const CATEGORIES = [
  { label: "Fotky úkolů", path: "taskPhotos" },
  { label: "Ad-hoc fotky", path: "adHocTaskPhotos" },
  { label: "Přílohy chatu", path: "chatAttachments" },
];

interface CategoryResult {
  label: string;
  bytes: number;
  fileCount: number;
}

/**
 * "Úložiště" — how much Firebase Storage this family's uploads (task
 * photos, ad-hoc photos, chat attachments — every families/{familyId}/...
 * path in storage.rules) actually take up, computed live via listAll/
 * getMetadata rather than a Cloud Function: storage.rules already grants
 * any family member read access to these paths, and Storage's `read` rule
 * action covers list/getMetadata too, so no backend call is needed.
 */
export default function StorageUsagePanel({ familyId }: { familyId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CategoryResult[] | null>(null);

  async function sizeOfFolder(path: string): Promise<{ bytes: number; fileCount: number }> {
    const folderRef = storageRef(getFirebaseStorage(), `families/${familyId}/${path}`);
    const { items, prefixes } = await listAll(folderRef);
    // taskPhotos is flat (items directly); adHocTaskPhotos/chatAttachments
    // nest one level deeper under a per-uid subfolder (prefixes) — combining
    // both covers either shape without needing to special-case which path is which.
    const nested = await Promise.all(prefixes.map((p) => listAll(p)));
    const allItems = [...items, ...nested.flatMap((r) => r.items)];
    const sizes = await Promise.all(allItems.map((item) => getMetadata(item).then((m) => m.size ?? 0).catch(() => 0)));
    return { bytes: sizes.reduce((a, b) => a + b, 0), fileCount: allItems.length };
  }

  async function refresh() {
    setLoading(true);
    try {
      const next = await Promise.all(
        CATEGORIES.map(async (c) => {
          const { bytes, fileCount } = await sizeOfFolder(c.path);
          return { label: c.label, bytes, fileCount };
        })
      );
      setResults(next);
    } catch (err) {
      toast.error(describeError(err, "Využití úložiště se nepodařilo zjistit."));
    } finally {
      setLoading(false);
    }
  }

  const totalBytes = results?.reduce((sum, r) => sum + r.bytes, 0) ?? 0;
  const percent = storageUsagePercent(totalBytes);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-500">Kolik místa zabírají fotky, videa a přílohy nahrané touto rodinou.</p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {results ? "Aktualizovat" : "Zjistit"}
        </button>
      </div>

      {results && (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-border p-4">
            <HardDrive size={28} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-500">Celkem využito</p>
              <p className="text-2xl font-bold">{formatBytes(totalBytes)}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {percent} % z {FIREBASE_STORAGE_FREE_TIER_GB} GB bezplatného limitu
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {results.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                <span>{r.label}</span>
                <span className="text-zinc-500">
                  {formatBytes(r.bytes)} · {r.fileCount} {r.fileCount === 1 ? "soubor" : "souborů"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5 rounded-xl border border-border p-4 text-xs text-zinc-500">
        <p className="font-semibold text-zinc-600">Limity a ceny Firebase Storage (orientační)</p>
        <p>
          Bezplatný limit: {FIREBASE_STORAGE_FREE_TIER_GB} GB uloženo, 1 GB/den stažení, 20 000 nahrání a 50 000 stažení
          denně — platí i na placeném (Blaze) plánu, dokud se rodina do limitu vejde.
        </p>
        <p>
          Po překročení (Blaze): řádově 0,026 $ za GB/měsíc úložiště a 0,12 $ za GB stažených dat. Přesné aktuální
          sazby se liší podle regionu bucketu — viz firebase.google.com/pricing.
        </p>
      </div>
    </div>
  );
}
