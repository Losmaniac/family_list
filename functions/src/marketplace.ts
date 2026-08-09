/**
 * Settles a P2P marketplace offer the moment it becomes 'accepted' —
 * Firestore rules already restrict who can accept (only the party that
 * didn't set the current amount) and freeze every other field, so this
 * just needs to move the XP: debit the payer, credit the earner, both as
 * paired ledger entries. If the payer can no longer afford it (balance
 * dropped since the offer went out), the trade is bounced back to
 * 'declined' instead of going negative — mirrors onRedemptionApproved.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry, canAffordReward } from "../../lib/xp-engine";
import { marketplaceTrade } from "../../lib/marketplace";
import type { MarketplaceOffer } from "../../lib/types";

export const onMarketplaceOfferWritten = onDocumentWritten(
  "families/{familyId}/marketplaceOffers/{offerId}",
  async (event) => {
    const before = event.data?.before.data() as MarketplaceOffer | undefined;
    const after = event.data?.after.data() as MarketplaceOffer | undefined;
    if (!after || before?.status === "accepted" || after.status !== "accepted") return;

    const { familyId, offerId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const offerRef = familyRef.collection("marketplaceOffers").doc(offerId);

    const { payerId, earnerId } = marketplaceTrade(after);
    const payerRef = familyRef.collection("members").doc(payerId);
    const earnerRef = familyRef.collection("members").doc(earnerId);

    await db.runTransaction(async (tx) => {
      const payerSnap = await tx.get(payerRef);
      const payer = payerSnap.data() as { xpBalance: number } | undefined;
      if (!payer || !canAffordReward(payer.xpBalance, after.currentXp)) {
        tx.update(offerRef, { status: "declined" });
        return;
      }

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({ userId: payerId, delta: -after.currentXp, reason: "marketplace_trade", note: after.title })
      );
      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({ userId: earnerId, delta: after.currentXp, reason: "marketplace_trade", note: after.title })
      );
      tx.update(payerRef, { xpBalance: FieldValue.increment(-after.currentXp) });
      tx.update(earnerRef, { xpBalance: FieldValue.increment(after.currentXp) });
    });
  }
);
