"use client";

import { useState } from "react";
import { Menu, X, type LucideIcon } from "lucide-react";

interface FloatingNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface FloatingNavMenuProps {
  items: FloatingNavItem[];
  activeHref?: string;
  onSelect: (href: string) => void;
}

// Both the trigger button and every item share this exact anchor, so each
// item's flyout position is a pure CSS transform from the trigger's own
// spot — that's what makes the "fly out into an arc, collapse back" motion
// work with a plain transition instead of animating layout properties.
const ANCHOR_STYLE: React.CSSProperties = {
  bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
  right: "1rem",
};

const OUTER_RADIUS = 150;
const INNER_RADIUS = 92;
const MAX_PER_RING = 5;

/** Position (as right/bottom offsets from the anchor) for item `index` of `count`, swept across the quarter-circle from "straight left" to "straight up". */
function arcOffset(index: number, count: number, radius: number): { right: number; bottom: number } {
  const angleDeg = count <= 1 ? 45 : (index / (count - 1)) * 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return { right: radius * Math.cos(angleRad), bottom: radius * Math.sin(angleRad) };
}

/**
 * The alternate nav style ("Vpravo dole ikona menu... do kruhu nebo
 * čtvrtkruhu") — a single button in the bottom-right corner that fans the
 * rest of the tabs out along a quarter-circle arc when tapped, instead of
 * a fixed bottom bar. Split across two arcs (outer ring gets the first 5
 * items, inner ring the rest) so items don't crowd together once there
 * are more than a handful of tabs.
 */
export default function FloatingNavMenu({ items, activeHref, onSelect }: FloatingNavMenuProps) {
  const [open, setOpen] = useState(false);

  const outer = items.slice(0, MAX_PER_RING);
  const inner = items.slice(MAX_PER_RING);
  const positioned = [
    ...outer.map((item, i) => ({ item, ...arcOffset(i, outer.length, OUTER_RADIUS) })),
    ...inner.map((item, i) => ({ item, ...arcOffset(i, inner.length, INNER_RADIUS) })),
  ];

  function handleSelect(href: string) {
    setOpen(false);
    onSelect(href);
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Zavřít menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/20"
        />
      )}

      {positioned.map(({ item, right, bottom }) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => handleSelect(item.href)}
            aria-label={item.label}
            title={item.label}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
            style={{
              ...ANCHOR_STYLE,
              transform: open ? `translate(${-right}px, ${-bottom}px) scale(1)` : "translate(0, 0) scale(0)",
              opacity: open ? 1 : 0,
            }}
            className={`fixed z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 ease-out ${
              active ? "bg-accent text-accent-foreground" : "bg-surface text-zinc-600"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        aria-expanded={open}
        style={ANCHOR_STYLE}
        className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transition-transform duration-200 ease-out"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </>
  );
}
