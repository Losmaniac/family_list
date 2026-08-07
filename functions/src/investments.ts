/**
 * Fixed-term "bonds": a member locks XP away for a set period at a fixed
 * rate. onInvestmentWritten locks the principal away the moment one is
 * created (cancelling it instead if the balance no longer covers it by the
 * time this runs) and returns just the principal on an early-withdrawal
 * request. maturedInvestmentsPayout is the daily sweep that credits
 * principal + interest once a term's up.
 *
 * reconcileInvestment mirrors the same pattern used for tasks
 * (see onTaskCompleted.ts): it looks only at an investment's *current*
 * state, never at what triggered the call, so it's safe to invoke both
 * from the live trigger and from reconcileInvestmentSweep — a periodic
 * safety net for the same "Firestore triggers can silently drop events
 * under rapid writes or mid-deploy" gap documented there.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { buildLedgerEntry } from "../../lib/xp-engine";
import { maturityPayout } from "../../lib/investments";
import { sendToTokens } from "./notifyHelpers";
import type { Investment, Member } from "../../lib/types";

async function reconcileInvestment(db: Firestore, familyId: string, investmentId: string): Promise<void> {
  const familyRef = db.collection("families").doc(familyId);
  const investmentRef = familyRef.collection("investments").doc(investmentId);

  await db.runTransaction(async (tx) => {
    const investmentSnap = await tx.get(investmentRef);
    const investment = investmentSnap.data() as Investment | undefined;
    if (!investment) return;

    const needsDeduction = investment.status === "active" && !investment.principalDeducted;
    const needsWithdrawal = investment.status === "withdrawal_requested";
    if (!needsDeduction && !needsWithdrawal) return;

    const memberRef = familyRef.collection("members").doc(investment.userId);

    if (needsDeduction) {
      const memberSnap = await tx.get(memberRef);
      const member = memberSnap.data() as Member | undefined;
      if (!member || member.xpBalance < investment.principal) {
        tx.update(investmentRef, { status: "cancelled" });
        return;
      }

      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({
          userId: investment.userId,
          delta: -investment.principal,
          reason: "investment_started",
          relatedTaskId: investmentId,
        })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(-investment.principal) });
      tx.update(investmentRef, { principalDeducted: true });
    } else {
      tx.set(
        familyRef.collection("xpLedger").doc(),
        buildLedgerEntry({
          userId: investment.userId,
          delta: investment.principal,
          reason: "investment_withdrawn_early",
          relatedTaskId: investmentId,
        })
      );
      tx.update(memberRef, { xpBalance: FieldValue.increment(investment.principal) });
      tx.update(investmentRef, { status: "withdrawn", payout: investment.principal });
    }
  });
}

export const onInvestmentWritten = onDocumentWritten(
  "families/{familyId}/investments/{investmentId}",
  async (event) => {
    const before = event.data?.before.data() as Investment | undefined;
    const after = event.data?.after.data() as Investment | undefined;
    if (!after) return;
    if (before && before.status === after.status && before.principalDeducted === after.principalDeducted) return;

    const { familyId, investmentId } = event.params;
    await reconcileInvestment(getFirestore(), familyId, investmentId);
  }
);

/**
 * Safety net: investments are rare enough (unlike dailyTasks) that
 * scanning every family's full collection each run is cheap, so this
 * doesn't bother scoping to a recent date range.
 */
export const reconcileInvestmentSweep = onSchedule({ schedule: "*/15 * * * *" }, async () => {
  const db = getFirestore();
  const familiesSnapshot = await db.collection("families").get();

  for (const familyDoc of familiesSnapshot.docs) {
    const investmentsSnapshot = await familyDoc.ref.collection("investments").get();
    for (const investmentDoc of investmentsSnapshot.docs) {
      const investment = investmentDoc.data() as Investment;
      const needsDeduction = investment.status === "active" && !investment.principalDeducted;
      const needsWithdrawal = investment.status === "withdrawal_requested";
      if (needsDeduction || needsWithdrawal) {
        await reconcileInvestment(db, familyDoc.id, investmentDoc.id);
      }
    }
  }
});

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

        const memberSnap = await memberRef.get();
        const token = (memberSnap.data() as Member | undefined)?.fcmToken;
        if (token) {
          await sendToTokens([token], "Family Quest", `Investice dozrála! +${payout} XP připsáno na účet.`);
        }
      }
    }
  }
);
