"use client";

import { useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";
import { CHESS_TIPS } from "@/lib/chess-tips";

/**
 * "Jak na šachy" — a collapsed-by-default education panel above the board
 * (see components/ChessGame.tsx) with hand-written strategy basics: how to
 * think through a move, opening principles, piece values, basic tactics,
 * endgame ideas. Purely informational, no XP tied to it — collapsed by
 * default so it doesn't push the actual board below the fold for a member
 * who already knows this and just wants to play.
 */
export default function ChessTips() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <GraduationCap size={16} />
          Jak na šachy — pravidla a základy strategie
        </span>
        <ChevronDown size={18} className={`shrink-0 text-zinc-400 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {CHESS_TIPS.map((section) => (
            <div key={section.id} className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold">{section.title}</p>
              <ul className="flex flex-col gap-1">
                {section.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-500">
                    <span aria-hidden className="select-none">
                      •
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
