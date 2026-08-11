/**
 * Pure billing logic for listening to Rádio / watching TV on /media — XP
 * is charged directly from the listener's balance while a stream plays,
 * separate from the system-funded XP economy elsewhere in the app (task
 * completion, Vzdělání, …). A parent-configurable number of free minutes
 * (Family.mediaGracePeriodMinutes, default DEFAULT_MEDIA_GRACE_PERIOD_MINUTES)
 * starts any single play session; after that, every *started* five-minute
 * block is billed at a parent-configurable per-kind rate
 * (Family.mediaXpCostPerBlock, default MEDIA_XP_COST_PER_BLOCK) — i.e.
 * billing happens at the start of a block, not once it's been fully
 * listened to, same as how mobile carriers round a call up to the next
 * full minute. The 5-minute block length itself isn't configurable.
 */

export type MediaKind = "radio" | "tv";

/** TV is charged 5x radio's per-block rate by default, same billing cadence for both. */
export const MEDIA_XP_COST_PER_BLOCK: Record<MediaKind, number> = {
  radio: 1,
  tv: 5,
};

export const DEFAULT_MEDIA_GRACE_PERIOD_MINUTES = 2;

const BLOCK_MS = 5 * 60_000;

/**
 * How many billable blocks should have been charged by now, given
 * `elapsedMs` since the stream started playing and the family's grace
 * period. Charges land at the start of each block: gracePeriod, +5min,
 * +10min, … — so this jumps straight to 1 the instant the grace period
 * ends, not only once the first full 5-minute block has elapsed.
 */
export function billableBlocksElapsed(elapsedMs: number, gracePeriodMinutes: number = DEFAULT_MEDIA_GRACE_PERIOD_MINUTES): number {
  const graceMs = gracePeriodMinutes * 60_000;
  if (elapsedMs < graceMs) return 0;
  return Math.floor((elapsedMs - graceMs) / BLOCK_MS) + 1;
}
