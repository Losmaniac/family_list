"use client";

import { useState } from "react";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, listAll, ref as storageRef } from "firebase/storage";
import { Trash2 } from "lucide-react";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { logAction } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_PHOTO_COMPRESSION_QUALITY,
  DEFAULT_PHOTO_MAX_DIMENSION,
} from "@/lib/image-compress";

const QUALITY_PRESETS = [
  { label: "Menší soubory", quality: 0.5, maxDimension: 1200 },
  { label: "Vyvážené", quality: 0.7, maxDimension: 1600 },
  { label: "Vyšší kvalita", quality: 0.9, maxDimension: 2000 },
];

function closestPresetIndex(quality: number, maxDimension: number): number {
  let best = 1;
  let bestDist = Infinity;
  QUALITY_PRESETS.forEach((p, i) => {
    const dist =
      Math.abs(p.quality - quality) +
      Math.abs(p.maxDimension - maxDimension) / 1000;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

export default function PhotoSettingsPanel({
  familyId,
  photoCompressionQuality,
  photoMaxDimension,
  photoRequirementsEnabled,
}: {
  familyId: string;
  photoCompressionQuality?: number;
  photoMaxDimension?: number;
  photoRequirementsEnabled?: boolean;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();
  const [savingQuality, setSavingQuality] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);
  const [savingRequirementToggle, setSavingRequirementToggle] = useState(false);

  async function handleToggleRequirements() {
    setSavingRequirementToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        photoRequirementsEnabled: photoRequirementsEnabled === false,
      });
    } catch {
      toast.error("Nepodařilo se změnit nastavení fotek.");
    } finally {
      setSavingRequirementToggle(false);
    }
  }

  const currentIndex = closestPresetIndex(
    photoCompressionQuality ?? DEFAULT_PHOTO_COMPRESSION_QUALITY,
    photoMaxDimension ?? DEFAULT_PHOTO_MAX_DIMENSION,
  );

  async function handlePickPreset(index: number) {
    setSavingQuality(true);
    try {
      const preset = QUALITY_PRESETS[index];
      await updateDoc(doc(getDb(), "families", familyId), {
        photoCompressionQuality: preset.quality,
        photoMaxDimension: preset.maxDimension,
      });
    } catch {
      toast.error("Nepodařilo se uložit kvalitu fotek.");
    } finally {
      setSavingQuality(false);
    }
  }

  async function handleClearPhotos() {
    const ok = await confirm({
      title: "Vymazat všechny fotky úkolů?",
      description:
        "Všechny nahrané fotky se nenávratně smažou. Úkoly samotné zůstanou beze změny.",
      confirmLabel: "Vymazat fotky",
      danger: true,
    });
    if (!ok) return;

    setClearingPhotos(true);
    try {
      const folderRef = storageRef(
        getFirebaseStorage(),
        `families/${familyId}/taskPhotos`,
      );
      const { items } = await listAll(folderRef);
      await Promise.all(
        items.map((item) => deleteObject(item).catch(() => {})),
      );

      const tasksWithPhotoSnap = await getDocs(
        query(
          collection(getDb(), "families", familyId, "dailyTasks"),
          where("photoUrl", ">", ""),
        ),
      );
      const docs = tasksWithPhotoSnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(getDb());
        for (const d of docs.slice(i, i + 400))
          batch.update(d.ref, { photoUrl: deleteField() });
        await batch.commit();
      }

      if (user)
        logAction(
          familyId,
          user.uid,
          "photos_cleared",
          `Vymazáno ${items.length} fotek`,
        );
      toast.success(`Vymazáno ${items.length} fotek.`);
    } catch {
      toast.error("Fotky se nepodařilo vymazat.");
    } finally {
      setClearingPhotos(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={photoRequirementsEnabled !== false}
          disabled={savingRequirementToggle}
          onChange={handleToggleRequirements}
        />
        Vyžadovat foto u úkolů, které to mají nastavené
      </label>
      {photoRequirementsEnabled === false && (
        <p className="text-xs text-zinc-500">
          Foto se teď nevyžaduje u žádného úkolu ani jednorázové aktivity — i
          těch, co mají „vyžaduje foto“ zapnuté jednotlivě. Zapnutím tady se to
          nastavení jednotlivých úkolů zase uplatní.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-zinc-500">
          Kvalita fotek při nahrávání — nižší kvalita šetří místo a je rychlejší
          na pomalém připojení.
        </p>
        <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
          {QUALITY_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePickPreset(i)}
              disabled={savingQuality}
              className={`rounded-full px-3 py-1 disabled:opacity-50 ${
                currentIndex === i
                  ? "bg-accent text-accent-foreground"
                  : "text-zinc-500"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClearPhotos}
        disabled={clearingPhotos}
        className="flex items-center gap-1.5 self-start rounded-full border border-danger/30 px-5 py-2 text-sm font-semibold text-danger disabled:opacity-50"
      >
        <Trash2 size={16} />{" "}
        {clearingPhotos ? "Mažu…" : "Vymazat všechny fotky"}
      </button>
    </div>
  );
}
