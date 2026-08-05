"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ListChecks, MessageCircle, Settings, ShoppingBag, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import StreakBadge from "@/components/StreakBadge";
import XpGainCelebration from "@/components/XpGainCelebration";

const NAV_ITEMS = [
  { href: "/today", label: "Dnes", icon: CalendarCheck, parentOnly: false },
  { href: "/family", label: "Rodina", icon: Users, parentOnly: false },
  { href: "/assign", label: "Zadat", icon: ListChecks, parentOnly: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, parentOnly: false },
  { href: "/shop", label: "Obchod", icon: ShoppingBag, parentOnly: false },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading, member } = useFamily();

  const loading = authLoading || familyLoading;

  useEffect(() => {
    if (!loading && (!user || !member)) {
      router.replace("/login");
    }
  }, [loading, user, member, router]);

  if (loading || !user || !member) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-500">Načítání…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <XpGainCelebration />
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link href={`/profile/${user.uid}`} className="flex items-center gap-3">
          <Avatar name={member.name} avatarUrl={member.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{member.name}</p>
            <StreakBadge currentStreak={member.currentStreak} />
          </div>
          <XPBar xpBalance={member.xpBalance} />
        </div>
        <Link
          href="/settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-surface-muted"
          aria-label="Nastavení"
        >
          <Settings size={20} />
        </Link>
      </header>

      <main className="flex-1 p-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-border bg-surface py-2">
        {NAV_ITEMS.filter((item) => !item.parentOnly || member.role === "parent").map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium ${
                active ? "text-accent" : "text-zinc-500"
              }`}
            >
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
