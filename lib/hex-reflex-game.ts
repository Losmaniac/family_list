/**
 * Pure, testable simulation core for the "Reflex" game
 * (components/games/HexReflexGame.tsx) — a small triangle orbits a fixed
 * radius around the center while ringed walls, each with a single gap,
 * contract inward from the edge. Kept dependency-free so an *optimal*
 * player (always steering the shortest way toward the current wall's gap)
 * can be simulated in a unit test — if that optimal player still loses,
 * something in the difficulty tuning is genuinely broken, not just hard.
 */

export interface HexWall {
  radius: number;
  gapStart: number;
  gapWidth: number;
}

export interface HexGameConfig {
  playerRadius: number;
  wallThickness: number;
  rotateSpeed: number; // radians/sec
  baseWallSpeed: number; // px/sec inward
  speedRampPerSec: number; // px/sec, added per second survived
  spawnIntervalBase: number; // seconds
  spawnIntervalMin: number;
  gapWidthBase: number; // radians
  gapWidthMin: number; // radians
  maxRadius: number;
}

export function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
}

export function wallSpeedAt(config: HexGameConfig, elapsed: number): number {
  return config.baseWallSpeed + config.speedRampPerSec * elapsed;
}

export function spawnIntervalAt(config: HexGameConfig, elapsed: number): number {
  return Math.max(config.spawnIntervalMin, config.spawnIntervalBase - elapsed * 0.05);
}

export function gapWidthAt(config: HexGameConfig, elapsed: number): number {
  return Math.max(config.gapWidthMin, config.gapWidthBase - elapsed * 0.02);
}

/** True if `angle` sits inside the wall's gap (survives passing through it). */
export function angleClearsWall(angle: number, wall: Pick<HexWall, "gapStart" | "gapWidth">): boolean {
  const rel = normalizeAngle(angle - wall.gapStart);
  return rel <= wall.gapWidth;
}

/** The shortest signed angular distance from `from` to `to`, in (-π, π]. */
export function shortestAngleDelta(from: number, to: number): number {
  const twoPi = Math.PI * 2;
  let delta = (to - from) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  return delta;
}

/**
 * Simulates an *optimal* player against a fresh sequence of walls: always
 * steers, at full rotation speed, the shortest way toward the middle of
 * whichever wall is currently closest. Returns how many walls it survived
 * before either being hit or the simulation's step budget running out
 * (survivedAll=true in that case). A low `wallsSurvived` for a config that
 * should be forgiving early on is exactly the kind of tuning bug this
 * exists to catch.
 */
export function simulateOptimalPlayer(config: HexGameConfig, simulatedSeconds: number, dt = 1 / 60): { wallsSurvived: number; survivedAll: boolean } {
  let angle = 0;
  let elapsed = 0;
  let timeSinceSpawn = 0;
  const walls: HexWall[] = [];
  let wallsSurvived = 0;
  const steps = Math.floor(simulatedSeconds / dt);

  for (let i = 0; i < steps; i++) {
    elapsed += dt;
    timeSinceSpawn += dt;

    const spawnInterval = spawnIntervalAt(config, elapsed);
    if (timeSinceSpawn >= spawnInterval) {
      timeSinceSpawn = 0;
      const gapWidth = gapWidthAt(config, elapsed);
      const gapStart = Math.random() * Math.PI * 2;
      walls.push({ radius: config.maxRadius, gapStart, gapWidth });
    }

    const speed = wallSpeedAt(config, elapsed);
    for (const wall of walls) wall.radius -= speed * dt;

    const closest = walls.reduce<HexWall | null>((closestSoFar, wall) => {
      if (wall.radius <= config.playerRadius) return closestSoFar;
      return !closestSoFar || wall.radius < closestSoFar.radius ? wall : closestSoFar;
    }, null);
    if (closest) {
      const targetAngle = normalizeAngle(closest.gapStart + closest.gapWidth / 2);
      const delta = shortestAngleDelta(angle, targetAngle);
      const maxStep = config.rotateSpeed * dt;
      angle = normalizeAngle(angle + Math.max(-maxStep, Math.min(maxStep, delta)));
    }

    for (const wall of walls) {
      const inBand = wall.radius <= config.playerRadius + config.wallThickness / 2 && wall.radius >= config.playerRadius - config.wallThickness / 2;
      if (inBand && !angleClearsWall(angle, wall)) {
        return { wallsSurvived, survivedAll: false };
      }
    }

    for (let w = walls.length - 1; w >= 0; w--) {
      if (walls[w].radius <= config.playerRadius - config.wallThickness / 2) {
        walls.splice(w, 1);
        wallsSurvived += 1;
      }
    }
  }

  return { wallsSurvived, survivedAll: true };
}
