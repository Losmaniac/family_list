"use client";

import { HelpCircle } from "lucide-react";
import { useDialog } from "@/lib/dialog-context";

/**
 * A small "?" affordance dropped onto a card to explain what it is —
 * stops propagation so it never triggers whatever the card itself does on
 * tap/click (e.g. TaskCard's toggle).
 */
export default function InfoButton({ title, description }: { title: string; description: string }) {
  const { info } = useDialog();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        info({ title, description });
      }}
      aria-label={`Co znamená: ${title}`}
      className="shrink-0 rounded-full p-0.5 text-zinc-400 hover:text-accent"
    >
      <HelpCircle size={16} />
    </button>
  );
}
