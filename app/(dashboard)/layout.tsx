"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ListChecks, MessageCircle, Settings, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import StreakBadge from "@/components/StreakBadge";
import XpGainCelebration from "@/components/XpGainCelebration";
import TaskCompleteFireworks from "@/components/TaskCompleteFireworks";

const NAV_ITEMS = [
  { href: "/today", label: "Dnes", icon: CalendarCheck, parentOnly: false },
  { href: "/family", label: "Rodina", icon: Users, parentOnly: false },
  { href: "/assign", label: "Zadat", icon: ListChecks, parentOnly: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, parentOnly: false },
  { href: "/shop", label: "Obchod", icon: ShoppingBag, parentOnly: false },
  { href: "/investments", label: "Investice", icon: TrendingUp, parentOnly: false },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading, member } = useFamily();

  const loading = authLoading || familyLoading;

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Let modified clicks (open in new tab, etc.) and browsers without the
    // View Transitions API fall through to Link's normal navigation.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (typeof document.startViewTransition !== "function") return;
    e.preventDefault();

    // Slide toward whichever side the target tab sits on relative to the
    // current one in the nav order — read by the --vt-direction-driven
    // keyframes in globals.css, scoped to the "page-content" transition
    // name below so only the content area moves, not the static chrome.
    const currentIndex = NAV_ITEMS.findIndex((item) => pathname?.startsWith(item.href));
    const targetIndex = NAV_ITEMS.findIndex((item) => item.href === href);
    const direction = targetIndex >= currentIndex ? 1 : -1;
    document.documentElement.style.setProperty("--vt-direction", String(direction));

    document.startViewTransition(() => router.push(href));
  }

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
      <TaskCompleteFireworks />
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-surface-muted"
          aria-label="Nastavení"
        >
          <Settings size={20} />
        </Link>
      </header>

      <main className="flex-1 p-4 pb-28" style={{ viewTransitionName: "page-content" }}>
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain border-t border-border bg-surface pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {NAV_ITEMS.filter((item) => !item.parentOnly || member.role === "parent").map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`flex w-1/5 min-w-[64px] shrink-0 snap-start flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
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
