"use client";

import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useToast } from "@/lib/toast-context";
import Avatar from "@/components/Avatar";
import type { Family, Member } from "@/lib/types";

// Only the cards a non-parent could ever see in the first place — mirrors
// the non-parentOnly entries in app/(dashboard)/layout.tsx's NAV_ITEMS
// (kept as a small standalone list here rather than a shared import, since
// this is the only other place that needs hrefs+labels, not icons).
const TOGGLABLE_NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/today", label: "Dnes" },
  { href: "/family", label: "Rodina" },
  { href: "/chat", label: "Chat" },
  { href: "/ai", label: "AI" },
  { href: "/shop", label: "Obchod" },
  { href: "/investments", label: "Investice" },
  { href: "/money", label: "Peníze" },
  { href: "/practice", label: "Vzdělání" },
  { href: "/calendar", label: "Kalendář" },
  { href: "/schedule", label: "Rozvrh" },
  { href: "/lists", label: "Seznamy" },
  { href: "/journals", label: "Deníky" },
  { href: "/media", label: "Média" },
  { href: "/weather", label: "Počasí" },
  { href: "/adam", label: "Adam" },
];

export default function NavVisibilitySettingsPanel({
  familyId,
  members,
  hiddenNavHrefsByMember,
}: {
  familyId: string;
  members: Member[];
  hiddenNavHrefsByMember: Family["hiddenNavHrefsByMember"];
}) {
  const toast = useToast();
  const children = members.filter((m) => m.role !== "parent");

  async function toggleHidden(memberId: string, href: string) {
    const currentHidden = hiddenNavHrefsByMember?.[memberId] ?? [];
    const nextHidden = currentHidden.includes(href)
      ? currentHidden.filter((h) => h !== href)
      : [...currentHidden, href];
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        [`hiddenNavHrefsByMember.${memberId}`]: nextHidden,
      });
    } catch {
      toast.error("Nepodařilo se uložit.");
    }
  }

  if (children.length === 0) {
    return <p className="text-sm text-zinc-500">Zatím žádné děti v rodině.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Vyber, které karty se danému dítěti zobrazují ve spodním menu. Tobě jako rodiči se vždy zobrazují všechny.
      </p>
      {children.map((child) => {
        const hidden = hiddenNavHrefsByMember?.[child.id] ?? [];
        return (
          <div key={child.id} className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Avatar name={child.name} avatarUrl={child.avatarUrl} size="sm" />
              <p className="font-medium">{child.name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOGGLABLE_NAV_ITEMS.map((item) => {
                const visible = !hidden.includes(item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => toggleHidden(child.id, item.href)}
                    className={`rounded-full px-3 py-1.5 text-sm ${
                      visible ? "bg-accent text-accent-foreground" : "border border-border text-zinc-400 line-through"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
