"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { setupPushNotifications } from "@/lib/push";
import StreakBadge from "@/components/StreakBadge";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading, familyId, member } = useFamily();
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const loading = authLoading || familyLoading;

  useEffect(() => {
    if (!loading && (!user || !member)) {
      router.replace("/login");
    }
  }, [loading, user, member, router]);

  async function enableNotifications() {
    if (!familyId || !user) return;
    const result = await setupPushNotifications(familyId, user.uid);
    setPushStatus(
      result === "granted"
        ? "Notifikace zapnuty."
        : result === "denied"
          ? "Notifikace zamítnuty."
          : "Notifikace nejsou podporovány v tomto prohlížeči."
    );
  }

  if (loading || !user || !member) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-500">Načítání…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="font-medium">{member.name}</p>
          <p className="text-sm text-amber-600">{member.xpBalance.toLocaleString("cs-CZ")} XP</p>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge currentStreak={member.currentStreak} />
          {!member.fcmToken && (
            <button
              type="button"
              onClick={enableNotifications}
              title={pushStatus ?? "Povolit notifikace"}
              className="text-xl"
            >
              🔔
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <Link href="/today" className="px-4 py-2 text-sm">
          Dnes
        </Link>
        {member.role === "parent" && (
          <Link href="/assign" className="px-4 py-2 text-sm">
            Zadat
          </Link>
        )}
        <Link href="/shop" className="px-4 py-2 text-sm">
          Obchod
        </Link>
      </nav>
    </div>
  );
}
