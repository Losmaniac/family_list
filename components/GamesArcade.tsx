"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { Trophy } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { readHighScore } from "@/lib/local-high-score";
import DuoGame from "./games/DuoGame";
import HexReflexGame from "./games/HexReflexGame";
import StackTowerGame from "./games/StackTowerGame";
import Avatar from "./Avatar";
import type { Member } from "@/lib/types";

type GameId = "duo" | "hex" | "stack";

const GAMES: { id: GameId; label: string; description: string; highScoreKey: string }[] = [
  { id: "duo", label: "Duo", description: "Dvě spojené kuličky rotují kolem středu — vyhni se padajícím zdem.", highScoreKey: "games:duo:highScore" },
  { id: "hex", label: "Reflex", description: "Trojúhelník krouží u středu, zdi se stahují ze všech stran — najdi mezeru.", highScoreKey: "games:hexreflex:highScore" },
  { id: "stack", label: "Věž", description: "Klepni přesně ve chvíli, kdy kostka leží nad tou předchozí.", highScoreKey: "games:stacktower:highScore" },
];

/**
 * No-XP arcade — three short reflex/timing games, same "trivial controls,
 * fast-escalating difficulty" shape as their genre's best-known examples,
 * built from scratch (canvas + requestAnimationFrame), no external game
 * engine or assets.
 *
 * Personal bests are still tracked locally per device (see
 * lib/local-high-score.ts — instant, no round-trip needed for the in-game
 * "Rekord" display) but also synced onto the member's own doc
 * (gameHighScores.{gameId}, self-writable — see firestore.rules) whenever
 * a new one is set, so the whole family can see who's on top per game.
 *
 * `select-none` stops the native text-selection a rapid click-drag (or
 * quick repeated tap, on some browsers) would otherwise trigger while
 * steering a game.
 */
export default function GamesArcade({ familyId }: { familyId?: string }) {
  const { user } = useAuth();
  const [active, setActive] = useState<GameId>("duo");
  const [members, setMembers] = useState<Member[]>([]);
  const activeGame = GAMES.find((g) => g.id === active)!;

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  // One-time catch-up: a device that already had a local high score before
  // this family-wide leaderboard existed should still show up in it,
  // rather than starting from "no score" until the next round is played.
  useEffect(() => {
    if (!familyId || !user) return;
    const me = members.find((m) => m.id === user.uid);
    if (!me) return;
    for (const game of GAMES) {
      const local = readHighScore(game.highScoreKey);
      const synced = me.gameHighScores?.[game.id] ?? 0;
      if (local > synced) {
        updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
          [`gameHighScores.${game.id}`]: local,
        }).catch(() => {
          // Best-effort — the next new high score will retry the write anyway.
        });
      }
    }
  }, [familyId, user, members]);

  async function handleNewHighScore(gameId: GameId, score: number) {
    if (!familyId || !user) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        [`gameHighScores.${gameId}`]: score,
      });
    } catch {
      // Best-effort — the local high score (and next attempt's write) still stand.
    }
  }

  const ranked = [...members]
    .filter((m) => (m.gameHighScores?.[active] ?? 0) > 0)
    .sort((a, b) => (b.gameHighScores?.[active] ?? 0) - (a.gameHighScores?.[active] ?? 0));

  return (
    <div className="flex select-none flex-col gap-3">
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
      {active === "duo" && <DuoGame onNewHighScore={(score) => handleNewHighScore("duo", score)} />}
      {active === "hex" && <HexReflexGame onNewHighScore={(score) => handleNewHighScore("hex", score)} />}
      {active === "stack" && <StackTowerGame onNewHighScore={(score) => handleNewHighScore("stack", score)} />}

      {familyId && ranked.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Trophy size={16} className="shrink-0 text-zinc-400" />
            Nejlepší v rodině — {activeGame.label}
          </p>
          <div className="flex flex-col gap-1.5">
            {ranked.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="w-4 shrink-0 text-right text-zinc-400">{i + 1}.</span>
                <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                <span className={`min-w-0 flex-1 truncate ${m.id === user?.uid ? "font-semibold" : ""}`}>{m.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{m.gameHighScores?.[active]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
