"use client";

import { useState } from "react";
import DuoGame from "./games/DuoGame";
import HexReflexGame from "./games/HexReflexGame";
import StackTowerGame from "./games/StackTowerGame";

type GameId = "duo" | "hex" | "stack";

const GAMES: { id: GameId; label: string; description: string }[] = [
  { id: "duo", label: "Duo", description: "Dvě spojené kuličky rotují kolem středu — vyhni se padajícím zdem." },
  { id: "hex", label: "Reflex", description: "Trojúhelník krouží u středu, zdi se stahují ze všech stran — najdi mezeru." },
  { id: "stack", label: "Věž", description: "Klepni přesně ve chvíli, kdy kostka leží nad tou předchozí." },
];

/** No-XP arcade — three short reflex/timing games, same "trivial controls, fast-escalating difficulty" shape as their genre's best-known examples, built from scratch (canvas + requestAnimationFrame), no external game engine or assets. */
export default function GamesArcade() {
  const [active, setActive] = useState<GameId>("duo");
  const activeGame = GAMES.find((g) => g.id === active)!;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${active === g.id ? "bg-accent text-accent-foreground" : "border border-border"}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{activeGame.description}</p>
      {active === "duo" && <DuoGame />}
      {active === "hex" && <HexReflexGame />}
      {active === "stack" && <StackTowerGame />}
    </div>
  );
}
