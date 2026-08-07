/**
 * users/{userId} — top-level lookup so the client can resolve which family a
 * signed-in user belongs to without scanning every families/{familyId} doc.
 * Only ever written by trusted server code (Cloud Functions), never by clients.
 */
export interface UserFamilyMapping {
  familyId: string;
}

/** A parent-configured investment term, overriding the built-in defaults in lib/investments.ts. */
export interface InvestmentTermConfig {
  days: number;
  /** Fractional return over the full term — 0.08 = principal grows by 8%. */
  rate: number;
  label: string;
}

/**
 * families/{familyId} — the family document itself, holding invite info and
 * parent-configured app-wide settings (appearance, feature toggles).
 * Client-writable only by a parent (see firestore.rules), matching the rest
 * of this tier of settings (not XP, not a security boundary beyond that).
 */
export interface Family {
  name: string;
  inviteCode: string;
  /** Hex accent color chosen by a parent in Settings; absent = the app's default amber. */
  accentColor?: string;
  /** Whether the Investments tab is shown at all; absent = enabled. */
  investmentsEnabled?: boolean;
  /** Custom investment terms replacing the built-in defaults; absent/empty = defaults apply. */
  investmentTerms?: InvestmentTermConfig[];
  /** Fractional XP bonus per consecutive streak day; absent = the built-in 0.1 (+10%/day). */
  streakBonusPerDay?: number;
  /** Fractional cap on the streak bonus; absent = the built-in 0.5 (+50% max). */
  streakBonusCap?: number;
  /** Custom names for levels 1-10 (and beyond, via the last one); absent/empty = the built-in Czech titles. */
  levelTitles?: string[];
  /** Whether members can ask the family for a new task once they're out of tasks for the day; absent = enabled. */
  taskRequestsEnabled?: boolean;
}

export type MemberRole = "parent" | "child";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
  xpBalance: number;
  currentStreak: number;
  /** Highest currentStreak ever reached — badges key off this, not the live streak, so they don't vanish when a streak breaks. Absent on members created before this field existed; treat as 0. */
  longestStreak?: number;
  /** Date (YYYY-MM-DD) of the last day a task was completed — drives currentStreak. */
  lastActiveDate?: string;
  /** ISO week (e.g. "2026-W32") the streak freeze was last used — one per week. */
  streakFreezeWeek?: string;
  /** Web Push (FCM) registration token for evening reminders. */
  fcmToken?: string;
  /** rewards/{id} this member is currently saving toward — drives the progress bar on /shop. */
  savingsGoalRewardId?: string;
}

export type Recurrence = "once" | "daily" | "weekly" | "monthly" | "custom";

export type TaskCategory = "household" | "school" | "health" | "personal" | "other";

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  xpValue: number;
  recurrence: Recurrence;
  assignedTo: string[];
  /** Days of week (0=Sun..6=Sat) the task is due — used by 'weekly'/'custom'. */
  daysOfWeek: number[];
  /** Date (YYYY-MM-DD) the task is due — used by 'once'. */
  date?: string;
  /** Day of month (1-31) the task is due — used by 'monthly'. */
  dayOfMonth?: number;
  active: boolean;
  /** If true, a photo must be attached before the task can be submitted for approval. */
  photoRequired?: boolean;
}

/**
 * pending -> submitted -> done (XP awarded) | returned (back to pending, with
 * a comment) -> missed (rolled over past its date while still pending).
 * Children always pass through 'submitted' for a parent to approve; a parent
 * completing their own task skips straight to 'done' (self-approved).
 */
export type DailyTaskStatus = "pending" | "submitted" | "done" | "returned" | "missed";

export interface DailyTask {
  id: string;
  templateId: string;
  assignedTo: string;
  date: string;
  status: DailyTaskStatus;
  completedAt?: number;
  xpAwarded?: number;
  /** Left by a parent when returning a submitted task instead of approving it. */
  returnComment?: string;
  /** Firebase Storage download URL for the proof photo, when the template requires one. */
  photoUrl?: string;
}

export interface XpLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  timestamp: number;
  relatedTaskId?: string;
  /** Free-text detail for reason == 'manual_adjustment' — the requesting parent's stated reason. */
  note?: string;
}

/**
 * requested -> approved (a *different* parent approves — one parent can't
 * unilaterally move XP — after which the ledger write happens) | rejected.
 * Auto-approved on creation if the family has no second parent to ever
 * approve it (see onXpAdjustmentRequestWritten).
 */
export type XpAdjustmentStatus = "requested" | "approved" | "rejected";

export interface XpAdjustmentRequest {
  id: string;
  targetUserId: string;
  requestedBy: string;
  delta: number;
  reason: string;
  status: XpAdjustmentStatus;
  timestamp: number;
}

export interface Reward {
  id: string;
  title: string;
  xpCost: number;
  approvalRequired: boolean;
  active: boolean;
}

/**
 * requested -> approved (XP deducted, reward reserved) -> fulfilled (parent
 * confirms it was actually handed over in real life) | rejected (from
 * requested only — an approved redemption is committed, it can't be
 * rejected after XP has already been spent).
 */
export type RewardRedemptionStatus = "requested" | "approved" | "fulfilled" | "rejected";

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  status: RewardRedemptionStatus;
  timestamp: number;
}

/**
 * pending -> approved (every other family member has approved — unanimous,
 * a task everyone lives with should have everyone's buy-in — at which point
 * a Cloud Function creates the real, active taskTemplate) | rejected (any
 * one other member can veto outright). The proposer can't vote on their own
 * proposal.
 */
export type TaskProposalStatus = "pending" | "approved" | "rejected";

export interface TaskProposal {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  xpValue: number;
  recurrence: Recurrence;
  daysOfWeek: number[];
  date?: string;
  dayOfMonth?: number;
  assignedTo: string[];
  proposedBy: string;
  /** userIds who've approved so far. */
  approvals: string[];
  status: TaskProposalStatus;
  timestamp: number;
  /**
   * Set when this proposal is a response to another member's TaskRequest
   * (same value as that request's doc ID, which is the requester's own
   * uid) — forces assignedTo to just them, since the task is meant for
   * the requester, not whoever proposed it. Once one linked proposal for
   * a request reaches unanimous approval, the Cloud Function auto-rejects
   * any other still-pending proposals for the same request.
   */
  requestId?: string;
}

export type TaskRequestStatus = "open" | "fulfilled" | "cancelled";

/**
 * A member's ask for a new task once they've run out of things to do.
 * Doc ID is the requester's own uid, so there's naturally at most one
 * open request per member — reopening after fulfilled/cancelled reuses
 * the same doc rather than creating a new one.
 */
export interface TaskRequest {
  id: string;
  requestedBy: string;
  status: TaskRequestStatus;
  timestamp: number;
}

/**
 * A parent creates the pool after the family has already agreed in person
 * who's chipping in — the app just tracks pledges and executes them, it
 * doesn't referee the negotiation. collecting -> fulfilled (a parent
 * deducts each contributor's pledge) | cancelled (a parent calls it off,
 * nothing is deducted).
 */
export type PooledContributionStatus = "collecting" | "fulfilled" | "cancelled";

export interface PooledContribution {
  id: string;
  rewardId: string;
  createdBy: string;
  invitedUserIds: string[];
  /** userId -> XP pledged. Only present once that member has set their pledge. */
  contributions: Record<string, number>;
  status: PooledContributionStatus;
  timestamp: number;
}

/**
 * active -> matured (held to term, principal + interest credited by a
 * scheduled Cloud Function) | withdrawal_requested -> withdrawn (cashed out
 * early, principal only — interest forfeited) | cancelled (balance no
 * longer covered the principal by the time the server processed it).
 */
export type InvestmentStatus = "active" | "withdrawal_requested" | "withdrawn" | "matured" | "cancelled";

export interface Investment {
  id: string;
  userId: string;
  principal: number;
  /** Fractional return at maturity, copied from the chosen InvestmentTerm at creation time. */
  rate: number;
  termDays: number;
  startedAt: number;
  maturesAt: number;
  status: InvestmentStatus;
  /** Final XP credited back — principal+interest if matured, principal only if withdrawn early. */
  payout?: number;
  /** Set once the principal has actually been deducted — lets a reconciliation sweep tell a fully-processed 'active' investment apart from one whose creation event never got processed. */
  principalDeducted?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

/**
 * A visibility log for actions parents can take on other members' behalf or
 * that change family-wide state — not a security boundary (entries are
 * self-attested by the client, same trust tier as `messages`), just an
 * answer to "kdo to udělal a kdy" when something looks off. Read-only for
 * parents; append-only, never edited or deleted.
 */
export type AuditAction =
  | "member_role_changed"
  | "member_removed"
  | "xp_adjustment_decided"
  | "task_approved"
  | "task_returned"
  | "task_completion_reverted"
  | "task_template_deleted"
  | "reward_redemption_decided"
  | "pooled_contribution_decided"
  | "chat_cleared";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: AuditAction;
  /** Human-readable detail, e.g. the affected member's or task's name. */
  detail: string;
  timestamp: number;
}
