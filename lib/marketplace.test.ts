import { describe, expect, it } from "vitest";
import { marketplaceTrade } from "./marketplace";

describe("marketplaceTrade", () => {
  it("has the target pay the proposer for an 'offer' (proposer performs the service)", () => {
    expect(marketplaceTrade({ kind: "offer", proposedBy: "child1", targetUserId: "parent1" })).toEqual({
      payerId: "parent1",
      earnerId: "child1",
    });
  });

  it("has the proposer pay the target for a 'request' (target performs the service)", () => {
    expect(marketplaceTrade({ kind: "request", proposedBy: "child1", targetUserId: "parent1" })).toEqual({
      payerId: "child1",
      earnerId: "parent1",
    });
  });
});
