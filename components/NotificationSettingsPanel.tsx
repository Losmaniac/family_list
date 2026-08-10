"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import { NOTIFICATION_TYPE_INFO, NOTIFICATION_TYPE_ORDER } from "@/lib/notification-settings";
import type { Family, Member, NotificationTypeId } from "@/lib/types";

/**
 * Parent-only, per-notification-type on/off + "who exactly" control (see
 * lib/notification-settings.ts for the shared semantics). A type with no
 * recipient choice (task_decided, marketplace_offer, investment_matured)
 * always goes to exactly the one person the event is about — nothing to
 * narrow there, just the enabled toggle.
 *
 * Recipient checkboxes default to "everyone eligible is checked" (no
 * stored recipientIds = unrestricted, the type's full natural audience).
 * Unchecking one member converts that into an explicit allowlist of
 * everyone *except* the one just unchecked — checking one back re-adds
 * it, and getting back to "everyone checked" clears the override
 * entirely rather than storing a redundant full list.
 */
export default function NotificationSettingsPanel({
  familyId,
  members,
  notificationSettings,
}: {
  familyId: string;
  members: Member[];
  notificationSettings?: Family["notificationSettings"];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState<NotificationTypeId | null>(null);

  async function patchType(typeId: NotificationTypeId, patch: Partial<{ enabled: boolean; recipientIds: string[] }>) {
    setSaving(typeId);
    try {
      const current = notificationSettings?.[typeId] ?? {};
      await updateDoc(doc(getDb(), "families", familyId), {
        [`notificationSettings.${typeId}`]: { ...current, ...patch },
      });
    } catch {
      toast.error("Nastavení se nepodařilo uložit.");
    } finally {
      setSaving(null);
    }
  }

  function toggleEnabled(typeId: NotificationTypeId, currentEnabled: boolean) {
    patchType(typeId, { enabled: !currentEnabled });
  }

  function toggleRecipient(typeId: NotificationTypeId, memberId: string, eligibleIds: string[]) {
    const stored = notificationSettings?.[typeId]?.recipientIds;
    const baseline = stored && stored.length > 0 ? stored : eligibleIds;
    const next = baseline.includes(memberId) ? baseline.filter((id) => id !== memberId) : [...baseline, memberId];
    // Back to "everyone checked" — clear the override instead of storing a
    // redundant full list, keeping "no restriction" represented one way.
    patchType(typeId, { recipientIds: next.length === eligibleIds.length ? [] : next });
  }

  return (
    <div className="flex flex-col gap-2">
      {NOTIFICATION_TYPE_ORDER.map((typeId) => {
        const info = NOTIFICATION_TYPE_INFO[typeId];
        const typeSettings = notificationSettings?.[typeId];
        const enabled = typeSettings?.enabled !== false;
        const stored = typeSettings?.recipientIds ?? [];
        const restricted = stored.length > 0;
        const eligibleMembers = info.audienceFilter === "parents" ? members.filter((m) => m.role === "parent") : members;
        const eligibleIds = eligibleMembers.map((m) => m.id);
        const checkedIds = restricted ? stored : eligibleIds;

        return (
          <div key={typeId} className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{info.label}</p>
                <p className="text-xs text-zinc-500">
                  Komu: {info.hasRecipientChoice && restricted ? `${checkedIds.length} z ${eligibleIds.length}` : info.audienceLabel}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-sm">
                <input type="checkbox" checked={enabled} disabled={saving === typeId} onChange={() => toggleEnabled(typeId, enabled)} />
                Zapnuto
              </label>
            </div>
            {enabled && info.hasRecipientChoice && eligibleMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                {eligibleMembers.map((m) => {
                  const checked = checkedIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleRecipient(typeId, m.id, eligibleIds)}
                      disabled={saving === typeId}
                      className={`rounded-full px-2.5 py-1 text-xs disabled:opacity-50 ${
                        checked ? "bg-accent text-accent-foreground" : "border border-border text-zinc-400"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
