/**
 * Pure logic for "Kvízový souboj" — one family member challenges another
 * to a head-to-head quiz. Each side proposes their own XP stake (not
 * necessarily equal); both answer the exact same set of questions (drawn
 * from the existing Vzdělání subject banks), asynchronously — there's no
 * live/simultaneous play, each side just plays through their copy of the
 * questions whenever they get to it. Whoever gets more correct wins the
 * whole bank; a tie means neither side's balance changes at all.
 *
 * No XP is deducted at challenge/accept time — only once the duel actually
 * completes (both sides have answered every question) does a single XP
 * ledger transfer happen. This intentionally skips an escrow/lock step: a
 * player could in theory spend the pledged XP elsewhere before the duel
 * finishes, in which case the duel is settled as far as it can be (see
 * functions/src/triviaDuel.ts) rather than half-completing a transfer —
 * an acceptable simplification for a family fun feature, not a real-money
 * system.
 */

export type TriviaDuelStatus = "pending_acceptance" | "declined" | "cancelled" | "in_progress" | "completed";

/**
 * Winner-take-all with a symmetric-refund tie: mathematically, moving the
 * *loser's* stake to the winner is equivalent to "pool both stakes, winner
 * takes the pool" — the winner's own stake is a wash either way — so the
 * actual settlement (see functions/src/triviaDuel.ts) only ever needs a
 * single-direction transfer of the loser's stake, never both stakes.
 */
export function determineDuelWinner(
  challengerScore: number,
  opponentScore: number,
  challengerId: string,
  opponentId: string
): string | "tie" {
  if (challengerScore > opponentScore) return challengerId;
  if (opponentScore > challengerScore) return opponentId;
  return "tie";
}

/** The XP transfer a completed duel needs: null for a tie (no balance change at all). */
export function settlementTransfer(
  winner: string | "tie",
  challengerId: string,
  challengerStake: number,
  opponentId: string,
  opponentStake: number
): { fromUserId: string; toUserId: string; amount: number } | null {
  if (winner === "tie") return null;
  const loserId = winner === challengerId ? opponentId : challengerId;
  const loserStake = winner === challengerId ? opponentStake : challengerStake;
  return { fromUserId: loserId, toUserId: winner, amount: loserStake };
}
