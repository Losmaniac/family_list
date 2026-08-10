"use client";

import { useEffect, useRef, useState } from "react";
import { readHighScore } from "@/lib/local-high-score";

const HIGH_SCORE_KEY = "games:hexreflex:highScore";
// A fraction of the canvas's shorter side, not a fixed pixel count — keeps
// the orbit (and the gap-vs-wall-thickness proportions) sane across screen
// sizes, same reasoning as Duo's orbitRadius.
const PLAYER_RADIUS_FRACTION = 0.14;
const PLAYER_ROTATE_SPEED = 5.2; // radians/sec while held — a full circle in ~1.2s
const BASE_WALL_SPEED = 80; // px/sec inward
// px/sec added *per second elapsed* (i.e. acceleration) — the shipped
// version accidentally multiplied this by elapsed*10 instead of elapsed,
// which made walls reach lethal speed within a couple of seconds instead
// of the intended ~20-30s ramp.
const SPEED_RAMP_PER_SEC = 9;
const SPAWN_INTERVAL_BASE = 1.3;
const WALL_THICKNESS = 18;

interface Wall {
  radius: number;
  gapStart: number;
  gapWidth: number;
}

function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
}

/**
 * A Super Hexagon-style reaction game: a small triangle orbits a fixed
 * radius around the center while ringed walls, each with a single gap,
 * contract inward. Rotate into each gap before its wall reaches the
 * player's radius. Rounds are short and brutal by design — wall speed and
 * gap size both ramp with survival time.
 */
export default function HexReflexGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    angle: 0,
    holding: 0 as -1 | 0 | 1,
    walls: [] as Wall[],
    elapsed: 0,
    timeSinceSpawn: 0,
    running: false,
    lastReportedScore: -1,
  });
  const [score, setScore] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [highScore, setHighScore] = useState(() => readHighScore(HIGH_SCORE_KEY));
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastTime = performance.now();

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * devicePixelRatio;
      canvas!.height = rect.height * devicePixelRatio;
    }
    resize();
    window.addEventListener("resize", resize);

    function endGame() {
      const s = stateRef.current;
      s.running = false;
      setPhase("over");
      const finalScore = Math.floor(s.elapsed * 10);
      setScore(finalScore);
      setHighScore((prev) => {
        if (finalScore <= prev) return prev;
        localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        return finalScore;
      });
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;
      const w = canvas!.width / devicePixelRatio;
      const h = canvas!.height / devicePixelRatio;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.hypot(w, h) / 2 + 30;
      const playerRadius = Math.min(w, h) * PLAYER_RADIUS_FRACTION;
      const wallSpeed = BASE_WALL_SPEED + SPEED_RAMP_PER_SEC * s.elapsed;
      const spawnInterval = Math.max(0.5, SPAWN_INTERVAL_BASE - s.elapsed * 0.015);

      if (s.running) {
        s.elapsed += dt;
        const liveScoreNow = Math.floor(s.elapsed * 10);
        if (liveScoreNow !== s.lastReportedScore) {
          s.lastReportedScore = liveScoreNow;
          setLiveScore(liveScoreNow);
        }
        s.angle = normalizeAngle(s.angle + s.holding * PLAYER_ROTATE_SPEED * dt);
        s.timeSinceSpawn += dt;
        if (s.timeSinceSpawn >= spawnInterval) {
          s.timeSinceSpawn = 0;
          // Gap width relative to a full turn, not a fixed radian count —
          // starts wide (over a quarter turn) and narrows toward a floor
          // that's still comfortably wider than the rotate speed needs to
          // cover between spawns.
          const gapWidth = Math.max(0.6, 1.6 - s.elapsed * 0.018);
          const gapStart = Math.random() * Math.PI * 2;
          s.walls.push({ radius: maxRadius, gapStart, gapWidth });
        }
        for (const wall of s.walls) wall.radius -= wallSpeed * dt;

        for (const wall of s.walls) {
          if (wall.radius <= playerRadius + WALL_THICKNESS / 2 && wall.radius >= playerRadius - WALL_THICKNESS / 2) {
            const rel = normalizeAngle(s.angle - wall.gapStart);
            if (rel > wall.gapWidth) {
              endGame();
              break;
            }
          }
        }
        s.walls = s.walls.filter((wall) => wall.radius > 0);
      }

      // --- render ---
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, w, h);

      ctx!.strokeStyle = "#334155";
      ctx!.lineWidth = WALL_THICKNESS;
      for (const wall of s.walls) {
        if (wall.radius < 10) continue;
        ctx!.beginPath();
        ctx!.arc(cx, cy, wall.radius, wall.gapStart + wall.gapWidth, wall.gapStart + Math.PI * 2);
        ctx!.stroke();
      }

      ctx!.fillStyle = "#f59e0b";
      ctx!.beginPath();
      ctx!.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx!.fill();

      const px = cx + playerRadius * Math.cos(s.angle);
      const py = cy + playerRadius * Math.sin(s.angle);
      const normal = s.angle;
      ctx!.save();
      ctx!.translate(px, py);
      ctx!.rotate(normal);
      ctx!.fillStyle = "#f59e0b";
      ctx!.beginPath();
      ctx!.moveTo(9, 0);
      ctx!.lineTo(-6, 6);
      ctx!.lineTo(-6, -6);
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function start() {
    stateRef.current = {
      angle: 0,
      holding: 0,
      walls: [],
      elapsed: 0,
      // A small head start on the spawn clock — gives the very first wall
      // an extra moment before it's even created, on top of the normal
      // spawn interval, so the round doesn't open with zero prep time.
      timeSinceSpawn: -0.6,
      running: true,
      lastReportedScore: -1,
    };
    setPhase("playing");
    setScore(0);
    setLiveScore(0);
  }

  function setHolding(dir: -1 | 0 | 1) {
    if (stateRef.current.running) stateRef.current.holding = dir;
  }

  function pointerSide(e: React.PointerEvent<HTMLCanvasElement>): -1 | 1 {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? -1 : 1;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>Skóre: {phase === "playing" ? liveScore : score}</span>
        <span>Rekord: {highScore}</span>
      </div>
      <div className="relative aspect-square w-full max-w-sm self-center overflow-hidden rounded-xl border border-border">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none select-none"
          onPointerDown={(e) => {
            e.preventDefault();
            setHolding(pointerSide(e));
          }}
          onPointerUp={() => setHolding(0)}
          onPointerLeave={() => setHolding(0)}
          onPointerCancel={() => setHolding(0)}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHolding(-1);
            if (e.key === "ArrowRight") setHolding(1);
          }}
          onKeyUp={() => setHolding(0)}
          tabIndex={0}
        />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-white">
            {phase === "over" && (
              <p className="text-lg font-semibold">
                Konec hry — skóre {score}
                {score >= highScore && score > 0 ? " 🎉 nový rekord!" : ""}
              </p>
            )}
            <p className="max-w-xs text-sm text-zinc-300">Drž levou nebo pravou stranu, ať se trojúhelník otáčí do mezer ve zdech, které se stahují ke středu.</p>
            <button
              type="button"
              onClick={start}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              {phase === "idle" ? "Start" : "Hrát znovu"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
