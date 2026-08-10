"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, doc, limit, onSnapshot, orderBy, query, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import type { NotificationRecord } from "@/lib/types";

const LIST_LIMIT = 30;

/**
 * The unread-count badge on the header avatar (families/{familyId}/
 * notifications/{id} — see functions/src/notifyHelpers.ts's notifyMembers,
 * which writes one per recipient alongside every push this app sends,
 * whether or not that recipient has a push token enabled). Opening the
 * popover marks every currently-loaded unread notification as read.
 */
export default function NotificationBadge({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    // A userId filter is required, not just cosmetic — firestore.rules
    // grants read only where resource.data.userId == request.auth.uid, and
    // Firestore rejects a *query* outright unless it can statically prove
    // every possible result satisfies that (an equality constraint on the
    // same field does; without it the whole query would just fail).
    const q = query(
      collection(getDb(), "families", familyId, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(LIST_LIMIT)
    );
    return onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as NotificationRecord));
    });
  }, [familyId, user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleOpen() {
    setOpen(true);
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(getDb());
    for (const n of unread) {
      batch.update(doc(getDb(), "families", familyId, "notifications", n.id), { read: true });
    }
    await batch.commit();
  }

  return (
    <>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={`${unreadCount} nepřečtených notifikací`}
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </button>
      )}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-16" onClick={() => setOpen(false)}>
            <div
              className="flex max-h-[75vh] w-full max-w-sm flex-col gap-2 overflow-y-auto rounded-2xl bg-surface p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Notifikace</h2>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
                  Zavřít
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-zinc-500">Zatím žádné notifikace.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-zinc-500">{n.body}</p>
                      <p className="mt-1 text-xs text-zinc-400">{formatDateTimeInFamilyZone(new Date(n.createdAt))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
