/**
 * Fixed-term "bonds": a member locks XP away for a set period at a fixed
 * rate. onInvestmentWritten locks the principal away the moment one is
 * created (cancelling it instead if the balance no longer covers it by the
 * time this runs) and returns just the principal on an early-withdrawal
 * request. maturedInvestmentsPayout is the daily sweep that credits
 * principal + interest once a term's up.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { maturityPayout } from "../../lib/investments";
import type { Investment, Member } from "../../lib/types";

export const onInvestmentWritten = onDocumentWritten(
  "families/{familyId}/investments/{investmentId}",
  async (event) => {
    const before = event.data?.before.data() as Investment | undefined;
    const after = event.data?.after.data() as Investment | undefined;
    if (!after) return;

    const { familyId, investmentId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const investmentRef = familyRef.collection("investments").doc(investmentId);
    const memberRef = familyRef.collection("members").doc(after.userId);

    if (!before && after.status === "active") {
      await db.runTransaction(async (tx) => {
        const memberSnap = await tx.get(memberRef);
        const member = memberSnap.data() as Member | undefined;
        if (!member || member.xpBalance < after.principal) {
          tx.update(investmentRef, { status: "cancelled" });
          return;
        }

        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({
            userId: after.userId,
            delta: -after.principal,
            reason: "investment_started",
            relatedTaskId: investmentId,
          })
        );
        tx.update(memberRef, { xpBalance: FieldValue.increment(-after.principal) });
      });
      return;
    }

    if (before?.status === "active" && after.status === "withdrawal_requested") {
      await db.runTransaction(async (tx) => {
        tx.set(
          familyRef.collection("xpLedger").doc(),
          buildLedgerEntry({
            userId: after.userId,
            delta: after.principal,
            reason: "investment_withdrawn_early",
            relatedTaskId: investmentId,
          })
        );
        tx.update(memberRef, { xpBalance: FieldValue.increment(after.principal) });
        tx.update(investmentRef, { status: "withdrawn", payout: after.principal });
      });
    }
  }
);

export const maturedInvestmentsPayout = onSchedule(
  { schedule: "0 6 * * *", timeZone: "Europe/Prague" },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const familiesSnapshot = await db.collection("families").get();

    for (const familyDoc of familiesSnapshot.docs) {
      const maturedSnapshot = await familyDoc.ref
        .collection("investments")
        .where("status", "==", "active")
        .where("maturesAt", "<=", now)
        .get();

      for (const investmentDoc of maturedSnapshot.docs) {
        const investment = investmentDoc.data() as Investment;
        const payout = maturityPayout(investment.principal, investment.rate);
        const memberRef = familyDoc.ref.collection("members").doc(investment.userId);

        await db.runTransaction(async (tx) => {
          tx.set(
            familyDoc.ref.collection("xpLedger").doc(),
            buildLedgerEntry({
              userId: investment.userId,
              delta: payout,
              reason: "investment_matured",
              relatedTaskId: investmentDoc.id,
            })
          );
          tx.update(memberRef, { xpBalance: FieldValue.increment(payout) });
          tx.update(investmentDoc.ref, { status: "matured", payout });
        });
      }
    }
  }
);
