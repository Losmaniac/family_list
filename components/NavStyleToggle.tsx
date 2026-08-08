"use client";

import { LayoutGrid, CircleDot } from "lucide-react";
import { useNavStyle } from "@/lib/nav-style-context";

const OPTIONS = [
  { value: "bar" as const, label: "Lišta dole", icon: LayoutGrid },
  { value: "radial" as const, label: "Plovoucí menu", icon: CircleDot },
];

export default function NavStyleToggle() {
  const { style, setStyle } = useNavStyle();

  return (
    <div className="inline-flex rounded-full border border-border p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setStyle(value)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm ${
            style === value ? "bg-accent text-accent-foreground" : "text-zinc-500"
          }`}
        >
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  );
}
