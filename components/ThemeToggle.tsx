"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Světlý", icon: Sun },
  { value: "system", label: "Systém", icon: Monitor },
  { value: "dark", label: "Tmavý", icon: Moon },
] as const;

function noopSubscribe() {
  return () => {};
}

// next-themes can't know the persisted theme during SSR, so avoid rendering
// the active state until mounted client-side — prevents a hydration mismatch.
// useSyncExternalStore (server snapshot false, client snapshot true) gives a
// hydration-safe "has mounted" flag without an effect-driven state update.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className="inline-flex rounded-full border border-border p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`flex items-center justify-center rounded-full p-2 ${
            mounted && theme === value ? "bg-accent text-accent-foreground" : "text-zinc-500"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
