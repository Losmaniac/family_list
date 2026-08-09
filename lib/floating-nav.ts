/** Pure geometry for FloatingNavMenu's arc layout — kept separate so it's testable without rendering the component. */

export const BASE_RADIUS = 92;
export const RING_STEP = 58;
// Minimum center-to-center distance (px) between two adjacent 48px buttons
// on the same arc, comfortably above the 48px button diameter itself.
export const MIN_SPACING = 56;

/** Position (as right/bottom offsets from the anchor) for item `index` of `count`, swept across the quarter-circle from "straight left" to "straight up". */
export function arcOffset(index: number, count: number, radius: number): { right: number; bottom: number } {
  const angleDeg = count <= 1 ? 45 : (index / (count - 1)) * 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return { right: radius * Math.cos(angleRad), bottom: radius * Math.sin(angleRad) };
}

/** How many items a quarter-circle arc of this radius can hold before adjacent buttons would start overlapping. */
export function ringCapacity(radius: number): number {
  const arcLength = (Math.PI / 2) * radius;
  return Math.max(2, Math.floor(arcLength / MIN_SPACING) + 1);
}

/**
 * Splits items across as many concentric quarter-circle rings as needed,
 * each ring sized to its own radius — a fixed items-per-ring count (the
 * previous approach) let a tight inner ring get just as many items as a
 * roomy outer one, which is exactly what caused icons to overlap once
 * there were more than a handful of nav tabs.
 */
export function layoutRings<T>(items: T[]): { item: T; right: number; bottom: number }[] {
  const positioned: { item: T; right: number; bottom: number }[] = [];
  let remaining = items;
  let radius = BASE_RADIUS;
  while (remaining.length > 0) {
    const capacity = ringCapacity(radius);
    const ring = remaining.slice(0, capacity);
    remaining = remaining.slice(capacity);
    ring.forEach((item, i) => positioned.push({ item, ...arcOffset(i, ring.length, radius) }));
    radius += RING_STEP;
  }
  return positioned;
}
