/**
 * Push notifications for the family-wide "needs someone's attention"
 * events not already covered by taskNotifications.ts (submit/approve/
 * return) or by the XP-moving triggers themselves: a new task proposal
 * or request to vote/respond to, an XP adjustment needing a second
 * parent, a pooled-contribution invite, and a reward redemption needing
 * a parent's decision or fulfillment. Purely notification side-effects —
 * none of these move XP or change any status themselves.
 */
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { notifyMembers, type NotifyTarget } from "./notifyHelpers";
import { xpAdjustmentNeedsApproval } from "../../lib/xp-engine";
import type {
  Member,
  MarketplaceOffer,
  PooledContribution,
  Reward,
  RewardRedemption,
  TaskProposal,
  TaskRequest,
  XpAdjustmentRequest,
} from "../../lib/types";

async function targetsFor(db: Firestore, familyId: string, userIds: string[]): Promise<NotifyTarget[]> {
  const familyRef = db.collection("families").doc(familyId);
  const snaps = await Promise.all(userIds.map((id) => familyRef.collection("members").doc(id).get()));
  return snaps.filter((s) => s.exists).map((s) => ({ userId: s.id, fcmToken: (s.data() as Member | undefined)?.fcmToken }));
}

async function memberName(db: Firestore, familyId: string, userId: string): Promise<string> {
  const snap = await db.collection("families").doc(familyId).collection("members").doc(userId).get();
  return (snap.data() as Member | undefined)?.name ?? "Někdo";
}

export const onTaskProposalCreated = onDocumentCreated(
  "families/{familyId}/taskProposals/{proposalId}",
  async (event) => {
    const proposal = event.data?.data() as TaskProposal | undefined;
    if (!proposal) return;

    const { familyId } = event.params;
    const db = getFirestore();
    const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
    const otherIds = membersSnap.docs.map((d) => d.id).filter((id) => id !== proposal.proposedBy);
    const targets = await targetsFor(db, familyId, otherIds);
    if (targets.length === 0) return;

    const proposerName = await memberName(db, familyId, proposal.proposedBy);
    await notifyMembers(familyId, targets, "Family Quest", `${proposerName} navrhl(a) nový úkol: „${proposal.title}“.`, db);
  }
);

export const onTaskRequestOpened = onDocumentWritten(
  "families/{familyId}/taskRequests/{requesterId}",
  async (event) => {
    const before = event.data?.before.data() as TaskRequest | undefined;
    const after = event.data?.after.data() as TaskRequest | undefined;
    // Fires on the first-ever request (create) and on reopening a
    // previously closed one — never on the fulfilled/cancelled transition.
    if (!after || after.status !== "open" || before?.status === "open") return;

    const { familyId, requesterId } = event.params;
    const db = getFirestore();
    const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
    const otherIds = membersSnap.docs.map((d) => d.id).filter((id) => id !== requesterId);
    const targets = await targetsFor(db, familyId, otherIds);
    if (targets.length === 0) return;

    const requesterName = await memberName(db, familyId, requesterId);
    await notifyMembers(familyId, targets, "Family Quest", `${requesterName} chce nový úkol — navrhni mu/jí nějaký.`, db);
  }
);

export const onXpAdjustmentRequestCreated = onDocumentCreated(
  "families/{familyId}/xpAdjustmentRequests/{requestId}",
  async (event) => {
    const request = event.data?.data() as XpAdjustmentRequest | undefined;
    if (!request || request.status !== "requested") return;

    const { familyId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const parentsSnap = await familyRef.collection("members").where("role", "==", "parent").get();
    // A single-parent family auto-approves instantly (see
    // onXpAdjustmentRequestWritten) — nobody left to notify.
    if (!xpAdjustmentNeedsApproval(parentsSnap.size)) return;

    const otherParentIds = parentsSnap.docs.map((d) => d.id).filter((id) => id !== request.requestedBy);
    const targets = await targetsFor(db, familyId, otherParentIds);
    if (targets.length === 0) return;

    await notifyMembers(
      familyId,
      targets,
      "Family Quest",
      `Žádost o úpravu XP (${request.delta >= 0 ? "+" : ""}${request.delta}) čeká na tvé schválení.`,
      db
    );
  }
);

export const onPooledContributionCreated = onDocumentCreated(
  "families/{familyId}/pooledContributions/{poolId}",
  async (event) => {
    const pool = event.data?.data() as PooledContribution | undefined;
    if (!pool) return;

    const { familyId } = event.params;
    const db = getFirestore();
    const targets = await targetsFor(db, familyId, pool.invitedUserIds);
    if (targets.length === 0) return;

    const rewardSnap = await db.collection("families").doc(familyId).collection("rewards").doc(pool.rewardId).get();
    const reward = rewardSnap.data() as Reward | undefined;
    await notifyMembers(familyId, targets, "Family Quest", `Zveme tě do sbírky na „${reward?.title ?? "odměnu"}“ — přispěj svým dílem XP.`, db);
  }
);

export const onRewardRedemptionActionable = onDocumentWritten(
  "families/{familyId}/rewardRedemptions/{redemptionId}",
  async (event) => {
    const before = event.data?.before.data() as RewardRedemption | undefined;
    const after = event.data?.after.data() as RewardRedemption | undefined;
    if (!after) return;
    const becameRequested = !before && after.status === "requested";
    const becameApproved = before?.status !== "approved" && after.status === "approved";
    if (!becameRequested && !becameApproved) return;

    const { familyId } = event.params;
    const db = getFirestore();
    const familyRef = db.collection("families").doc(familyId);
    const parentsSnap = await familyRef.collection("members").where("role", "==", "parent").get();
    const targets = await targetsFor(
      db,
      familyId,
      parentsSnap.docs.map((d) => d.id)
    );
    if (targets.length === 0) return;

    const rewardSnap = await familyRef.collection("rewards").doc(after.rewardId).get();
    const reward = rewardSnap.data() as Reward | undefined;
    const requesterName = await memberName(db, familyId, after.userId);

    const message = becameRequested
      ? `${requesterName} žádá o odměnu „${reward?.title ?? after.rewardId}“ — čeká na schválení.`
      : `Odměna „${reward?.title ?? after.rewardId}“ pro ${requesterName} je schválená — čeká na vyřízení.`;
    await notifyMembers(familyId, targets, "Family Quest", message, db);
  }
);

export const onMarketplaceOfferActionable = onDocumentWritten(
  "families/{familyId}/marketplaceOffers/{offerId}",
  async (event) => {
    const before = event.data?.before.data() as MarketplaceOffer | undefined;
    const after = event.data?.after.data() as MarketplaceOffer | undefined;
    if (!after) return;

    const { familyId } = event.params;
    const db = getFirestore();

    let notifyUserId: string;
    let message: string;

    if (!before) {
      // Just created — the target hasn't seen it yet, the proposer wrote it themselves.
      notifyUserId = after.targetUserId;
      const proposerName = await memberName(db, familyId, after.proposedBy);
      message =
        after.kind === "offer"
          ? `${proposerName} nabízí službu „${after.title}“ za ${after.currentXp} XP.`
          : `${proposerName} poptává službu „${after.title}“ a nabízí ${after.currentXp} XP.`;
    } else if (after.status === "pending" && after.lastActionBy !== before.lastActionBy) {
      // A counter-offer — notify whoever must respond next (not the one who just countered).
      notifyUserId = after.lastActionBy === after.proposedBy ? after.targetUserId : after.proposedBy;
      const counterName = await memberName(db, familyId, after.lastActionBy);
      message = `${counterName} navrhuje jinou částku za „${after.title}“: ${after.currentXp} XP.`;
    } else if (before.status === "pending" && after.status !== "pending") {
      // Resolved — the responder is whoever wasn't before.lastActionBy (rules
      // require lastActionBy to stay unchanged on accept/decline); notify the
      // original lastActionBy, who was the one waiting on a response.
      const responderId = before.lastActionBy === before.proposedBy ? before.targetUserId : before.proposedBy;
      notifyUserId = before.lastActionBy;
      const responderName = await memberName(db, familyId, responderId);
      message =
        after.status === "accepted"
          ? `${responderName} přijal(a) nabídku „${after.title}“ za ${after.currentXp} XP.`
          : `${responderName} odmítl(a) nabídku „${after.title}“.`;
    } else {
      return;
    }

    const targets = await targetsFor(db, familyId, [notifyUserId]);
    if (targets.length === 0) return;
    await notifyMembers(familyId, targets, "Family Quest", message, db);
  }
);
