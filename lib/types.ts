/**
 * users/{userId} — top-level lookup so the client can resolve which family a
 * signed-in user belongs to without scanning every families/{familyId} doc.
 * Only ever written by trusted server code (Cloud Functions), never by clients.
 */
export interface UserFamilyMapping {
  familyId: string;
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
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}
