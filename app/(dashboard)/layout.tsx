"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Camera,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  CloudSun,
  GraduationCap,
  ListChecks,
  MessageCircle,
  Moon,
  Settings,
  ShoppingBag,
  TrendingUp,
  Tv,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { isWithinCurfew } from "@/lib/date-utils";
import { NavStyleProvider, useNavStyle } from "@/lib/nav-style-context";
import Avatar from "@/components/Avatar";
import XPBar from "@/components/XPBar";
import StreakBadge from "@/components/StreakBadge";
import XpGainCelebration from "@/components/XpGainCelebration";
import TaskCompleteFireworks from "@/components/TaskCompleteFireworks";
import OfflineBanner from "@/components/OfflineBanner";
import AccentColorSync from "@/components/AccentColorSync";
import AppBadgeSync from "@/components/AppBadgeSync";
import ForegroundPushNotifications from "@/components/ForegroundPushNotifications";
import FloatingNavMenu from "@/components/FloatingNavMenu";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  parentOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Dnes", icon: CalendarCheck, parentOnly: false },
  { href: "/family", label: "Rodina", icon: Users, parentOnly: false },
  { href: "/assign", label: "Zadat", icon: ListChecks, parentOnly: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, parentOnly: false },
  { href: "/shop", label: "Obchod", icon: ShoppingBag, parentOnly: false },
  { href: "/investments", label: "Investice", icon: TrendingUp, parentOnly: false },
  { href: "/photos", label: "Fotky", icon: Camera, parentOnly: true },
  { href: "/practice", label: "Vzdělání", icon: GraduationCap, parentOnly: false },
  { href: "/calendar", label: "Kalendář", icon: CalendarDays, parentOnly: false },
  { href: "/schedule", label: "Rozvrh", icon: CalendarClock, parentOnly: false },
  { href: "/lists", label: "Seznamy", icon: ClipboardList, parentOnly: false },
  { href: "/journals", label: "Deníky", icon: BookOpen, parentOnly: false },
  { href: "/media", label: "Média", icon: Tv, parentOnly: false },
  { href: "/weather", label: "Počasí", icon: CloudSun, parentOnly: false },
];

function navOrderStorageKey(uid: string): string {
  return `nav-order:${uid}`;
}

/**
 * Applies a member's saved href order on top of the canonical NAV_ITEMS
 * list — any href missing from storedOrder (a tab added after they last
 * reordered, or one they've never seen) is appended at the end in its
 * default position, and any stale href (a tab that no longer exists) is
 * dropped silently.
 */
function resolveOrder(storedOrder: string[]): NavItem[] {
  const byHref = new Map<string, NavItem>(NAV_ITEMS.map((item) => [item.href, item]));
  const ordered = storedOrder.map((href) => byHref.get(href)).filter((item): item is NavItem => Boolean(item));
  const seen = new Set(ordered.map((item) => item.href));
  return [...ordered, ...NAV_ITEMS.filter((item) => !seen.has(item.href))];
}

function SortableNavButton({
  item,
  active,
  onSelect,
  grow = true,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
  /** false in a scrollable vertical column — each button keeps its natural size instead of being force-stretched to fill an equal share of the column's height. */
  grow?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.href });
  const Icon = item.icon;

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      {...attributes}
      {...listeners}
      type="button"
      aria-current={active ? "page" : undefined}
      // A plain click still calls onSelect directly — dnd-kit only treats a
      // press as a drag once it clears the sensors' activation constraints
      // (see sensors below), so a normal tap falls through to this like a
      // regular button click.
      onClick={onSelect}
      className={`flex min-w-0 ${grow ? "flex-1" : "shrink-0"} touch-none flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium ${
        active ? "text-accent" : "text-zinc-500"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <Icon size={20} />
      <span className="max-w-full truncate">{item.label}</span>
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavStyleProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </NavStyleProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { loading: familyLoading, member, family } = useFamily();
  const { style: navStyle } = useNavStyle();

  const loading = authLoading || familyLoading;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [navOrder, setNavOrder] = useState<string[]>(() => NAV_ITEMS.map((item) => item.href));
  const [loadedOrderForUid, setLoadedOrderForUid] = useState<string | null>(null);

  // Re-checked every minute so a curfew engages/lifts on its own without
  // needing a page reload — a child mid-session at 21:59 should get
  // blocked the moment it turns 22:00, not just on their next navigation.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // A column-style nav is `position: fixed` (so it doesn't disrupt the
  // existing page-scroll behavior the bottom-bar/floating styles rely on),
  // which means it isn't naturally pushed below the header the way normal
  // in-flow content is — it has to be told the header's actual height so it
  // starts under it instead of overlapping it. Measured live (not a
  // hardcoded pixel guess) so it stays correct if the header's content ever
  // changes height.
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    observer.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, []);

  // Adjust state during rendering (React's documented pattern for "sync
  // once when an external identity becomes available/changes") instead of
  // an effect — `user` is always null during SSR and the very first client
  // render (Firebase auth resolves asynchronously), so this never touches
  // localStorage before hydration and never causes a mismatch; it just
  // applies this member's saved order the first render where `user` is
  // actually known.
  if (user && loadedOrderForUid !== user.uid) {
    setLoadedOrderForUid(user.uid);
    const stored = typeof window !== "undefined" ? localStorage.getItem(navOrderStorageKey(user.uid)) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setNavOrder(parsed);
      } catch {
        // Corrupt/foreign value — ignore, keep the default order.
      }
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // "Dlouhý klik" on touch — a press has to hold for `delay` ms before it
    // counts as a drag, so a normal tap still just navigates.
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } })
  );

  function visibleNavItems() {
    return resolveOrder(navOrder).filter((item) => {
      if (item.parentOnly && member?.role !== "parent") return false;
      if (item.href === "/investments" && family?.investmentsEnabled === false) return false;
      // "Vzdělání" is opt-in per member (Settings → parent picks who) while
      // it's being rolled out — parents can always reach it themselves to
      // try it and configure who else sees it.
      if (
        item.href === "/practice" &&
        member?.role !== "parent" &&
        !family?.practiceVisibleTo?.includes(member?.id ?? "")
      ) {
        return false;
      }
      // A parent can individually hide any non-parent-only card per child
      // (Settings → Viditelnost karet) — parents always see every card
      // themselves regardless of this setting.
      if (
        member?.role !== "parent" &&
        family?.hiddenNavHrefsByMember?.[member?.id ?? ""]?.includes(item.href)
      ) {
        return false;
      }
      return true;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !user) return;

    const visibleHrefs = visibleNavItems().map((item) => item.href);
    const oldIndex = visibleHrefs.indexOf(String(active.id));
    const newIndex = visibleHrefs.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedVisible = arrayMove(visibleHrefs, oldIndex, newIndex);

    // Splice the reordered visible hrefs back into the full canonical
    // order, preserving the relative position of any items this member
    // can't currently see (e.g. parent-only tabs for a child) so they land
    // back in the right place if visibility ever changes.
    const fullOrder = resolveOrder(navOrder).map((item) => item.href);
    let cursor = 0;
    const nextOrder = fullOrder.map((href) => (visibleHrefs.includes(href) ? reorderedVisible[cursor++] : href));

    setNavOrder(nextOrder);
    localStorage.setItem(navOrderStorageKey(user.uid), JSON.stringify(nextOrder));
  }

  function navigateToTab(href: string) {
    // Slide toward whichever side the target tab sits on relative to the
    // current one in this member's own nav order — read by the
    // --vt-direction-driven keyframes in globals.css, scoped to the
    // "page-content" transition name below so only the content area moves,
    // not the static chrome.
    const orderedHrefs = visibleNavItems().map((item) => item.href);
    const currentIndex = orderedHrefs.findIndex((itemHref) => pathname?.startsWith(itemHref));
    const targetIndex = orderedHrefs.indexOf(href);
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
    // (the day-selector strips, the week schedule grid) — let those scroll
    // natively instead of also triggering a tab change.
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

  const curfewActive =
    member.role === "child" &&
    family?.childCurfewEnabled === true &&
    isWithinCurfew(new Date(now), family.childCurfewStartHour ?? 22, family.childCurfewEndHour ?? 6);

  if (curfewActive) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Moon size={48} className="text-accent" />
        <p className="text-lg font-medium">Je čas jít spát 🌙</p>
        <p className="max-w-xs text-sm text-zinc-500">
          Aplikace je teď v noci zamčená. Uvidíme se ráno!
        </p>
      </main>
    );
  }

  const items = visibleNavItems();
  const activeHref = items.find((item) => pathname?.startsWith(item.href))?.href;

  const mainPaddingClass =
    navStyle === "radial"
      ? "pb-20"
      : navStyle === "bar-2row"
        ? "pb-40"
        : navStyle === "column-left"
          ? "pl-20"
          : navStyle === "column-right"
            ? "pr-20"
            : "pb-28";

  function renderSortableItems(grow: boolean = true) {
    return items.map((item) => (
      <SortableNavButton
        key={item.href}
        item={item}
        active={item.href === activeHref}
        onSelect={() => navigateToTab(item.href)}
        grow={grow}
      />
    ));
  }

  return (
    <div className="flex flex-1 flex-col">
      <XpGainCelebration />
      <TaskCompleteFireworks />
      <OfflineBanner />
      <AccentColorSync />
      <AppBadgeSync />
      <ForegroundPushNotifications />
      <header ref={headerRef} className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link href={`/profile/${user.uid}`} className="flex items-center gap-3">
          <Avatar name={member.name} avatarUrl={member.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{member.name}</p>
            <StreakBadge
              currentStreak={member.currentStreak}
              streakBonusPerDay={family?.streakBonusPerDay}
              streakBonusCap={family?.streakBonusCap}
            />
          </div>
          <XPBar xpBalance={member.xpBalance} levelTitles={family?.levelTitles} levelThresholds={family?.levelThresholds} />
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
        className={`flex-1 p-4 ${mainPaddingClass}`}
        style={{ viewTransitionName: "page-content" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </main>

      {navStyle === "radial" ? (
        <FloatingNavMenu items={items} activeHref={activeHref} onSelect={navigateToTab} />
      ) : navStyle === "bar-2row" ? (
        <nav
          className="fixed inset-x-0 bottom-0 grid border-t border-border bg-surface pt-2"
          style={{
            gridTemplateColumns: `repeat(${Math.ceil(items.length / 2)}, 1fr)`,
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.href)} strategy={rectSortingStrategy}>
              {renderSortableItems()}
            </SortableContext>
          </DndContext>
        </nav>
      ) : navStyle === "column-left" || navStyle === "column-right" ? (
        <nav
          className={`fixed bottom-0 z-30 flex w-20 flex-col overflow-y-auto bg-surface ${
            navStyle === "column-left" ? "left-0 border-r border-border" : "right-0 border-l border-border"
          }`}
          style={{
            top: headerHeight,
            paddingLeft: navStyle === "column-left" ? "max(0.25rem, env(safe-area-inset-left))" : undefined,
            paddingRight: navStyle === "column-right" ? "max(0.25rem, env(safe-area-inset-right))" : undefined,
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.href)} strategy={verticalListSortingStrategy}>
              {renderSortableItems(false)}
            </SortableContext>
          </DndContext>
        </nav>
      ) : (
        <nav
          className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface pt-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((item) => item.href)} strategy={horizontalListSortingStrategy}>
              {renderSortableItems()}
            </SortableContext>
          </DndContext>
        </nav>
      )}
    </div>
  );
}
