"use client";

import { useEffect, useRef, useState } from "react";
import { readHighScore } from "@/lib/local-high-score";

const HIGH_SCORE_KEY = "games:stacktower:highScore";
const BLOCK_HEIGHT = 34;
const BASE_SPEED = 160; // px/sec
const SPEED_RAMP_PER_BLOCK = 6;
const INITIAL_WIDTH = 160;

interface PlacedBlock {
  x: number;
  width: number;
}

interface FallingChunk {
  x: number;
  width: number;
  y: number;
  vy: number;
}

/**
 * A Stack-style precision game: a block slides back and forth across the
 * top; tap to drop it onto the tower. Only the overlap with the block
 * below survives — the rest breaks off and falls away — so each miss
 * makes the next block narrower and the game correspondingly harder,
 * until the width hits zero.
 */
export default function StackTowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    placed: [] as PlacedBlock[],
    current: { x: 0, width: INITIAL_WIDTH, dir: 1 as -1 | 1 },
    falling: [] as FallingChunk[],
    cameraY: 0,
    running: false,
  });
  const [score, setScore] = useState(0);
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

    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = stateRef.current;
      const w = canvas!.width / devicePixelRatio;
      const h = canvas!.height / devicePixelRatio;
      const speed = BASE_SPEED + SPEED_RAMP_PER_BLOCK * (s.placed.length - 1) * 10;

      if (s.running) {
        s.current.x += s.current.dir * speed * dt;
        if (s.current.x <= 0 || s.current.x + s.current.width >= w) {
          s.current.dir = s.current.dir === 1 ? -1 : 1;
          s.current.x = Math.max(0, Math.min(s.current.x, w - s.current.width));
        }
      }
      for (const chunk of s.falling) {
        chunk.vy += 900 * dt;
        chunk.y += chunk.vy * dt;
      }
      s.falling = s.falling.filter((chunk) => chunk.y < h + 60);

      // --- render ---
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx!.fillStyle = "#0f172a";
      ctx!.fillRect(0, 0, w, h);

      const baseY = h - BLOCK_HEIGHT - 20;

      for (let i = 0; i < s.placed.length; i++) {
        const b = s.placed[i];
        const y = baseY - i * BLOCK_HEIGHT + s.cameraY;
        if (y < -BLOCK_HEIGHT || y > h) continue;
        ctx!.fillStyle = `hsl(${(30 + i * 18) % 360}, 70%, 55%)`;
        ctx!.fillRect(b.x, y, b.width, BLOCK_HEIGHT - 2);
      }

      if (s.running) {
        const i = s.placed.length;
        const y = baseY - i * BLOCK_HEIGHT + s.cameraY;
        ctx!.fillStyle = `hsl(${(30 + i * 18) % 360}, 70%, 60%)`;
        ctx!.fillRect(s.current.x, y, s.current.width, BLOCK_HEIGHT - 2);
      }

      for (const chunk of s.falling) {
        ctx!.fillStyle = "#64748b";
        ctx!.fillRect(chunk.x, chunk.y, chunk.width, BLOCK_HEIGHT - 2);
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
    const canvas = canvasRef.current;
    const w = canvas ? canvas.getBoundingClientRect().width : 300;
    stateRef.current = {
      placed: [{ x: (w - INITIAL_WIDTH) / 2, width: INITIAL_WIDTH }],
      current: { x: 0, width: INITIAL_WIDTH, dir: 1 },
      falling: [],
      cameraY: 0,
      running: true,
    };
    setPhase("playing");
    setScore(0);
  }

  function drop() {
    const s = stateRef.current;
    if (!s.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = canvas.getBoundingClientRect().height;

    const below = s.placed[s.placed.length - 1];
    const cur = s.current;
    const overlapStart = Math.max(below.x, cur.x);
    const overlapEnd = Math.min(below.x + below.width, cur.x + cur.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 4) {
      const baseY = h - BLOCK_HEIGHT - 20 - (s.placed.length - 1) * BLOCK_HEIGHT + s.cameraY;
      s.falling.push({ x: cur.x, width: cur.width, y: baseY, vy: 0 });
      s.running = false;
      setPhase("over");
      const finalScore = s.placed.length - 1;
      setScore(finalScore);
      setHighScore((prev) => {
        if (finalScore <= prev) return prev;
        localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        return finalScore;
      });
      return;
    }

    if (cur.x < overlapStart) {
      const baseY = h - BLOCK_HEIGHT - 20 - (s.placed.length - 1) * BLOCK_HEIGHT + s.cameraY;
      s.falling.push({ x: cur.x, width: overlapStart - cur.x, y: baseY, vy: 40 });
    }
    if (cur.x + cur.width > overlapEnd) {
      const baseY = h - BLOCK_HEIGHT - 20 - (s.placed.length - 1) * BLOCK_HEIGHT + s.cameraY;
      s.falling.push({ x: overlapEnd, width: cur.x + cur.width - overlapEnd, y: baseY, vy: 40 });
    }

    s.placed.push({ x: overlapStart, width: overlapWidth });
    setScore(s.placed.length - 1);

    const visibleLayers = Math.floor((h - 20) / BLOCK_HEIGHT);
    if (s.placed.length > visibleLayers - 3) {
      s.cameraY += BLOCK_HEIGHT;
    }

    s.current = { x: 0, width: overlapWidth, dir: s.placed.length % 2 === 0 ? 1 : -1 };
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>Skóre: {score}</span>
        <span>Rekord: {highScore}</span>
      </div>
      <div className="relative aspect-[3/4] w-full max-w-sm self-center overflow-hidden rounded-xl border border-border">
        <canvas ref={canvasRef} className="h-full w-full touch-none" onPointerDown={phase === "playing" ? drop : undefined} />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-white">
            {phase === "over" && (
              <p className="text-lg font-semibold">
                Konec hry — skóre {score}
                {score >= highScore && score > 0 ? " 🎉 nový rekord!" : ""}
              </p>
            )}
            <p className="max-w-xs text-sm text-zinc-300">Klepni přesně v okamžiku, kdy kostka leží nad tou předchozí — přesah se odřízne.</p>
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
