"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Camera, CalendarCheck, ListChecks, MessageCircle, Settings, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import StreakBadge from "@/components/StreakBadge";
import XpGainCelebration from "@/components/XpGainCelebration";
import TaskCompleteFireworks from "@/components/TaskCompleteFireworks";
import OfflineBanner from "@/components/OfflineBanner";
import AccentColorSync from "@/components/AccentColorSync";

const NAV_ITEMS = [
  { href: "/today", label: "Dnes", icon: CalendarCheck, parentOnly: false },
  { href: "/family", label: "Rodina", icon: Users, parentOnly: false },
  { href: "/assign", label: "Zadat", icon: ListChecks, parentOnly: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, parentOnly: false },
  { href: "/shop", label: "Obchod", icon: ShoppingBag, parentOnly: false },
  { href: "/investments", label: "Investice", icon: TrendingUp, parentOnly: false },
  { href: "/photos", label: "Fotky", icon: Camera, parentOnly: true },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading, member, family } = useFamily();

  const loading = authLoading || familyLoading;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function visibleNavItems() {
    return NAV_ITEMS.filter((item) => {
      if (item.parentOnly && member?.role !== "parent") return false;
      if (item.href === "/investments" && family?.investmentsEnabled === false) return false;
      return true;
    });
  }

  function navigateToTab(href: string) {
    // Slide toward whichever side the target tab sits on relative to the
    // current one in the nav order — read by the --vt-direction-driven
    // keyframes in globals.css, scoped to the "page-content" transition
    // name below so only the content area moves, not the static chrome.
    const currentIndex = NAV_ITEMS.findIndex((item) => pathname?.startsWith(item.href));
    const targetIndex = NAV_ITEMS.findIndex((item) => item.href === href);
    const direction = targetIndex >= currentIndex ? 1 : -1;

    if (typeof document.startViewTransition !== "function") {
      router.push(href);
      return;
    }
    document.documentElement.style.setProperty("--vt-direction", String(direction));
    document.startViewTransition(() => router.push(href));
  }

  function isInsideHorizontalScroller(el: EventTarget | null): boolean {
    let node = el instanceof Element ? el : null;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if ((style.overflowX === "auto" || style.overflowX === "scroll") && node.scrollWidth > node.clientWidth) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  function handleTouchStart(e: React.TouchEvent) {
    // Don't hijack swipes that belong to a horizontally-scrolling element
    // (the day-selector strips, the week schedule grid, the nav itself) —
    // let those scroll natively instead of also triggering a tab change.
    if (isInsideHorizontalScroller(e.target)) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !member) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const visibleItems = visibleNavItems();
    const currentIndex = visibleItems.findIndex((item) => pathname?.startsWith(item.href));
    if (currentIndex === -1) return;
    // Swipe left (negative dx) advances to the next tab, like turning a page.
    const targetIndex = currentIndex + (dx < 0 ? 1 : -1);
    if (targetIndex < 0 || targetIndex >= visibleItems.length) return;

    navigateToTab(visibleItems[targetIndex].href);
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
      <OfflineBanner />
      <AccentColorSync />
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

      <main
        className="flex-1 p-4 pb-28"
        style={{ viewTransitionName: "page-content" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain border-t border-border bg-surface pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {visibleNavItems().map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <button
              key={item.href}
              type="button"
              aria-current={active ? "page" : undefined}
              // A plain button calling navigateToTab directly — routed through
              // the exact same imperative path as the swipe gesture below, so
              // a tap gets the identical view-transition slide instead of
              // whatever timing next/link's own click handling would add.
              onClick={() => navigateToTab(item.href)}
              className={`flex w-1/5 min-w-[64px] shrink-0 snap-start flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                active ? "text-accent" : "text-zinc-500"
              }`}
            >
              <Icon size={22} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
