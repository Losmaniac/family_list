/**
 * Pure, testable geometry for the "Duo" game (components/games/DuoGame.tsx)
 * — kept dependency-free so the core claim ("every generated obstacle can
 * actually be passed") is provable in a unit test, not just eyeballed.
 *
 * The twin balls sit opposite each other on a circle of `orbitRadius`
 * around a fixed pivot; only rotation is controlled, so a ball's x can
 * only ever land in [pivot.x - orbitRadius, pivot.x + orbitRadius]. Each
 * ball is checked against an obstacle independently, at whatever moment
 * its own y crosses the obstacle's band — the two balls don't need to
 * clear the same obstacle at the same instant, since their y positions
 * (and thus crossing moments) differ at any angle other than exactly
 * 0/π. What every obstacle *does* need is a gap that's reachable at all:
 * generated outside [pivot.x - orbitRadius, pivot.x + orbitRadius], no
 * rotation could ever put a ball's center there.
 */

export interface DuoObstacleSpec {
  gapStart: number;
  gapWidth: number;
}

/**
 * Picks a gap guaranteed to be reachable: entirely inside
 * [pivotX - orbitRadius, pivotX + orbitRadius] whenever it fits, otherwise
 * clamped to the reachable band's left edge (only possible when
 * gapWidth > 2*orbitRadius, in which case the gap simply has some harmless
 * overhang past the balls' actual range — still fully reachable).
 */
export function pickReachableGap(canvasWidth: number, pivotX: number, orbitRadius: number, gapWidth: number): DuoObstacleSpec {
  const reachMin = Math.max(0, pivotX - orbitRadius);
  const reachMax = Math.min(canvasWidth, pivotX + orbitRadius);
  const span = Math.max(0, reachMax - reachMin - gapWidth);
  const gapStart = reachMin + Math.random() * span;
  return { gapStart, gapWidth };
}

/** Whether a ball of `ballRadius` centered at `x` fits entirely inside the gap. */
export function ballFitsInGap(x: number, ballRadius: number, gap: DuoObstacleSpec): boolean {
  return x - ballRadius >= gap.gapStart && x + ballRadius <= gap.gapStart + gap.gapWidth;
}

/**
 * Whether *some* angle puts a ball's center at an x that fits the gap —
 * sampled across the full circle since a ball's x as a function of angle
 * has no simpler closed form to invert. This is what actually needs to
 * hold for every obstacle to be passable (each ball is checked
 * independently — see the file comment above), unlike requiring both
 * balls to fit simultaneously, which isn't how the collision check works.
 */
export function someAngleFitsGap(pivotX: number, orbitRadius: number, ballRadius: number, gap: DuoObstacleSpec, samples = 720): boolean {
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const x = pivotX + orbitRadius * Math.cos(angle);
    if (ballFitsInGap(x, ballRadius, gap)) return true;
  }
  return false;
}
