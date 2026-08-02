export type MemberRole = "parent" | "child";

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  avatarUrl?: string;
  xpBalance: number;
  currentStreak: number;
}

export type Recurrence = "daily" | "weekly" | "custom";

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  xpValue: number;
  recurrence: Recurrence;
  assignedTo: string[];
  daysOfWeek: number[];
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
