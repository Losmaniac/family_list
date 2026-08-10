import { describe, expect, it } from "vitest";
import { determineDuelWinner, settlementTransfer } from "./trivia-duel";

describe("determineDuelWinner", () => {
  it("picks whoever scored higher", () => {
    expect(determineDuelWinner(7, 5, "a", "b")).toBe("a");
    expect(determineDuelWinner(3, 6, "a", "b")).toBe("b");
  });

  it("returns tie on equal scores", () => {
    expect(determineDuelWinner(4, 4, "a", "b")).toBe("tie");
  });
});

describe("settlementTransfer", () => {
  it("returns null (no balance change) on a tie", () => {
    expect(settlementTransfer("tie", "a", 10, "b", 20)).toBeNull();
  });

  it("moves the loser's own stake to the winner, regardless of whose stake is bigger", () => {
    expect(settlementTransfer("a", "a", 10, "b", 20)).toEqual({ fromUserId: "b", toUserId: "a", amount: 20 });
    expect(settlementTransfer("b", "a", 10, "b", 20)).toEqual({ fromUserId: "a", toUserId: "b", amount: 10 });
  });

  it("is equivalent to pooling both stakes and giving the winner the pool", () => {
    // Winner's net gain should equal the loser's stake; loser's net loss
    // should equal their own stake — exactly what "winner takes the whole
    // bank" means, without ever having to move the winner's own stake.
    const challengerStake = 15;
    const opponentStake = 25;
    const transfer = settlementTransfer("a", "a", challengerStake, "b", opponentStake);
    expect(transfer?.amount).toBe(opponentStake);
  });
});
