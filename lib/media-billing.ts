/**
 * Pure billing logic for listening to Rádio / watching TV on /media — XP
 * is charged directly from the listener's balance while a stream plays,
 * separate from the system-funded XP economy elsewhere in the app (task
 * completion, Vzdělání, …). The first two minutes of any single play
 * session are free; from minute 2 onward, every *started* five-minute
 * block is billed — i.e. billing happens at the start of a block, not
 * once it's been fully listened to, same as how mobile carriers round a
 * call up to the next full minute.
 */

export type MediaKind = "radio" | "tv";

/** TV is charged 5x radio's per-block rate, same billing cadence for both. */
export const MEDIA_XP_COST_PER_BLOCK: Record<MediaKind, number> = {
  radio: 1,
  tv: 5,
};

const GRACE_PERIOD_MS = 2 * 60_000;
const BLOCK_MS = 5 * 60_000;

/**
 * How many billable blocks should have been charged by now, given
 * `elapsedMs` since the stream started playing. Charges land at the start
 * of each block: 2:00, 7:00, 12:00, 17:00, … — so this jumps straight to 1
 * the instant the 2-minute grace period ends, not only once the first
 * full 5-minute block has elapsed.
 */
export function billableBlocksElapsed(elapsedMs: number): number {
  if (elapsedMs < GRACE_PERIOD_MS) return 0;
  return Math.floor((elapsedMs - GRACE_PERIOD_MS) / BLOCK_MS) + 1;
}
