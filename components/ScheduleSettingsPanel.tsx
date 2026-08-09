"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";

export default function ScheduleSettingsPanel({
  familyId,
  scheduleVisibleToAll,
}: {
  familyId: string;
  scheduleVisibleToAll?: boolean;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), { scheduleVisibleToAll: !scheduleVisibleToAll });
    } catch {
      toast.error("Nepodařilo se uložit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={scheduleVisibleToAll === true} onChange={handleToggle} disabled={saving} />
      Děti vidí rozvrhy všech sourozenců, ne jen svůj
    </label>
  );
}
