/**
 * Pure logic for the P2P XP marketplace — who pays and who earns depends on
 * the offer's kind, and this is the one place that decision is made so the
 * client (for display) and the Cloud Function (for the actual transfer)
 * can't drift apart on it.
 */
import type { MarketplaceOffer } from "./types";

export interface MarketplaceTrade {
  payerId: string;
  earnerId: string;
}

/** kind 'offer': proposer performs the service, target pays them. kind 'request': proposer pays, target performs. */
export function marketplaceTrade(offer: Pick<MarketplaceOffer, "kind" | "proposedBy" | "targetUserId">): MarketplaceTrade {
  return offer.kind === "offer"
    ? { payerId: offer.targetUserId, earnerId: offer.proposedBy }
    : { payerId: offer.proposedBy, earnerId: offer.targetUserId };
}
