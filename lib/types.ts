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
  /** Date (YYYY-MM-DD) of the last day a task was completed — drives currentStreak. */
  lastActiveDate?: string;
  /** Web Push (FCM) registration token for evening reminders. */
  fcmToken?: string;
}

export type Recurrence = "once" | "daily" | "weekly" | "custom";

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  xpValue: number;
  recurrence: Recurrence;
  assignedTo: string[];
  /** Days of week (0=Sun..6=Sat) the task is due — used by 'weekly'/'custom'. */
  daysOfWeek: number[];
  /** Date (YYYY-MM-DD) the task is due — used by 'once'. */
  date?: string;
  active: boolean;
}

export type DailyTaskStatus = "pending" | "done" | "missed";

export interface DailyTask {
  id: string;
  templateId: string;
  assignedTo: string;
  date: string;
  status: DailyTaskStatus;
  completedAt?: number;
  xpAwarded?: number;
}

export interface XpLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  timestamp: number;
  relatedTaskId?: string;
}

export interface Reward {
  id: string;
  title: string;
  xpCost: number;
  approvalRequired: boolean;
  active: boolean;
}

export type RewardRedemptionStatus = "requested" | "approved" | "rejected";

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  status: RewardRedemptionStatus;
  timestamp: number;
}
