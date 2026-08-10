"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";

const STORAGE_KEY = "settings-collapsed-sections";

function readCollapsedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeCollapsedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable (private mode, quota, ...) — collapse state just won't persist
  }
}

const noopSubscribe = () => () => {};

/**
 * A settings section that can be folded away — Nastavení has grown into a
 * long list of mostly parent-only panels that are set once and rarely
 * revisited. Collapse state persists per-device in localStorage (keyed by
 * `id`), not per-family, since it's a personal UI preference, not app data.
 *
 * Reads that state via useSyncExternalStore, same hydration-safe pattern
 * as the `mounted` flag used elsewhere on this page: the server snapshot
 * is always "open" (no localStorage there), so the initial client render
 * matches the server-sent HTML, and the real value takes over right after
 * hydration instead of via a setState-in-effect (which cascades renders).
 *
 * `headerExtra` is for actions that must stay reachable regardless of
 * collapse state (e.g. "Přidat" on Členové rodiny) — it renders as a
 * sibling next to the toggle button, not nested inside it, since a
 * <button> can't contain another interactive control.
 */
export default function SettingsSection({
  id,
  title,
  headerExtra,
  children,
}: {
  id: string;
  title: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isCollapsed = useSyncExternalStore(
    noopSubscribe,
    () => readCollapsedIds().has(id),
    () => false
  );
  const [, forceRerender] = useState(0);
  const open = !isCollapsed;

  function toggle() {
    const ids = readCollapsedIds();
    if (isCollapsed) ids.delete(id);
    else ids.add(id);
    writeCollapsedIds(ids);
    forceRerender((n) => n + 1);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
          <ChevronDown size={18} className={`shrink-0 text-zinc-400 transition-transform ${open ? "" : "-rotate-90"}`} />
          <h2 className="font-medium">{title}</h2>
        </button>
        {headerExtra}
      </div>
      {open && <div className="flex flex-col gap-3">{children}</div>}
    </section>
  );
}
