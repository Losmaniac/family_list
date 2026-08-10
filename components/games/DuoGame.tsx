"use client";

import { useEffect, useRef, useState } from "react";
import { readHighScore } from "@/lib/local-high-score";
import { pickReachableGap } from "@/lib/duo-game";

const HIGH_SCORE_KEY = "games:duo:highScore";
const ROTATION_SPEED = 3.6; // radians/sec while held
// A fraction of canvas width, not a fixed pixel count — the pair needs to
// visibly sweep a good chunk of the screen (a tiny fixed radius just looks
// like "a thing spinning in place"), and obstacle gaps are generated
// relative to this same value so they always land inside actual reach
// (see lib/duo-game.ts — a gap generated across the *whole* canvas width
// used to land outside the reachable band more often than not, making
// those obstacles impossible to pass no matter the angle).
const ORBIT_RADIUS_FRACTION = 0.3;
const BALL_RADIUS = 9;
const BASE_FALL_SPEED = 130; // px/sec
const SPEED_RAMP_PER_SEC = 9; // px/sec added per second survived (acceleration)
const SPAWN_INTERVAL_BASE = 1.3; // seconds between obstacles at the start

interface Obstacle {
  y: number;
  height: number;
  gapStart: number;
  gapWidth: number;
  passed: boolean;
}

/**
 * A Duet-style reflex game: two balls, rigidly opposite each other around a
 * fixed pivot, rotate together as the player holds either half of the
 * canvas. Bars with a single gap fall from the top; steer the pair so both
 * balls thread the gap. Speed ramps with survival time, same escalating-
 * difficulty shape as the original.
 */
export default function DuoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    angle: 0,
    holding: 0 as -1 | 0 | 1, // -1 = rotate CCW (left held), 1 = CW (right held)
    obstacles: [] as Obstacle[],
    elapsed: 0,
    timeSinceSpawn: 0,
    running: false,
    over: false,
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
      s.over = true;
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
      const pivot = { x: w / 2, y: h * 0.72 };
      const orbitRadius = Math.min(w, h) * ORBIT_RADIUS_FRACTION;
      const fallSpeed = BASE_FALL_SPEED + SPEED_RAMP_PER_SEC * s.elapsed;
      const spawnInterval = Math.max(0.55, SPAWN_INTERVAL_BASE - s.elapsed * 0.01);

      if (s.running) {
        s.elapsed += dt;
        const liveScoreNow = Math.floor(s.elapsed * 10);
        if (liveScoreNow !== s.lastReportedScore) {
          s.lastReportedScore = liveScoreNow;
          setLiveScore(liveScoreNow);
        }
        s.angle += s.holding * ROTATION_SPEED * dt;
        s.timeSinceSpawn += dt;
        if (s.timeSinceSpawn >= spawnInterval) {
          s.timeSinceSpawn = 0;
          // A gap width relative to orbitRadius (rather than a fixed pixel
          // value) so the difficulty ramp stays meaningful regardless of
          // canvas size — always somewhere between "as wide as the full
          // reachable band" (trivial) and "just wide enough for a ball"
          // (brutal), never so narrow it's unreachable.
          const gapWidth = Math.max(orbitRadius * 0.65, orbitRadius * 1.5 - s.elapsed * 3);
          const gap = pickReachableGap(w, pivot.x, orbitRadius, gapWidth);
          s.obstacles.push({ y: -20, height: 16, gapStart: gap.gapStart, gapWidth: gap.gapWidth, passed: false });
        }
        for (const o of s.obstacles) o.y += fallSpeed * dt;
        s.obstacles = s.obstacles.filter((o) => o.y < h + 40);

        const p1 = { x: pivot.x + orbitRadius * Math.cos(s.angle), y: pivot.y + orbitRadius * Math.sin(s.angle) };
        const p2 = { x: pivot.x + orbitRadius * Math.cos(s.angle + Math.PI), y: pivot.y + orbitRadius * Math.sin(s.angle + Math.PI) };

        for (const o of s.obstacles) {
          for (const p of [p1, p2]) {
            if (p.y + BALL_RADIUS > o.y && p.y - BALL_RADIUS < o.y + o.height) {
              if (p.x - BALL_RADIUS < o.gapStart || p.x + BALL_RADIUS > o.gapStart + o.gapWidth) {
                endGame();
              }
            }
          }
        }
      }

      // --- render ---
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, w, h);

      ctx!.fillStyle = "#334155";
      for (const o of s.obstacles) {
        ctx!.fillRect(0, o.y, o.gapStart, o.height);
        ctx!.fillRect(o.gapStart + o.gapWidth, o.y, w - (o.gapStart + o.gapWidth), o.height);
      }

      const p1 = { x: pivot.x + orbitRadius * Math.cos(s.angle), y: pivot.y + orbitRadius * Math.sin(s.angle) };
      const p2 = { x: pivot.x + orbitRadius * Math.cos(s.angle + Math.PI), y: pivot.y + orbitRadius * Math.sin(s.angle + Math.PI) };
      ctx!.strokeStyle = "#f59e0b";
      ctx!.lineWidth = 3;
      ctx!.beginPath();
      ctx!.moveTo(p1.x, p1.y);
      ctx!.lineTo(p2.x, p2.y);
      ctx!.stroke();
      ctx!.fillStyle = "#f59e0b";
      for (const p of [p1, p2]) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx!.fill();
      }

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
      obstacles: [],
      elapsed: 0,
      // A small head start on the spawn clock — see the identical comment
      // in HexReflexGame's start().
      timeSinceSpawn: -0.6,
      running: true,
      over: false,
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
      <div className="relative aspect-[3/4] w-full max-w-sm self-center overflow-hidden rounded-xl border border-border">
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
            <p className="max-w-xs text-sm text-zinc-300">Drž levou nebo pravou stranu obrazovky a otáčej dvojicí kuliček, ať se vyhneš zdem.</p>
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
