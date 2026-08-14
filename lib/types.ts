import type { RadioStation } from "./radio-browser";
import type { TvChannel } from "./iptv-org";
import type { InvestDemoAssetType } from "./invest-demo";
import type { TriviaDuelStatus } from "./trivia-duel";
import type { ChessDifficulty } from "./chess-ai";

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
  /** Custom XP thresholds for levels 1-10 (index 0/level 1 is always 0, never overridable); absent/short = the built-in curve fills the rest. Levels beyond 10 keep growing at the same flat step regardless. */
  levelThresholds?: number[];
  /** Whether members can ask the family for a new task once they're out of tasks for the day; absent = enabled. */
  taskRequestsEnabled?: boolean;
  /** Max number of still-pending/returned tasks at which a member can already ask for another one, before the list is fully empty; absent = no limit (always allowed, as soon as taskRequestsEnabled). */
  taskRequestMaxRemaining?: number;
  /** JPEG quality (0-1) task proof photos are compressed to before upload; absent = 0.7. */
  photoCompressionQuality?: number;
  /** Longer edge (px) task proof photos are downscaled to before upload; absent = 1600. */
  photoMaxDimension?: number;
  /** Whether the 19:00 "nedokončené úkoly" push reminder is sent at all; absent = enabled. */
  eveningReminderEnabled?: boolean;
  /** Whether one missed day per week is forgiven instead of resetting the streak; absent = enabled. */
  streakFreezeEnabled?: boolean;
  /** Max XP a member can earn per day from the "Vzdělání" practice module; absent = the built-in default (see lib/practice.ts). */
  practiceDailyXpCap?: number;
  /** Member IDs who see the "Vzdělání" module at all (nav item + /practice); absent/empty = nobody but parents, who can always reach it to try/configure it. */
  practiceVisibleTo?: string[];
  /** Whether a non-parent can see every member's class schedule, not just their own; absent = false (own schedule only — parents can always see everyone's). */
  scheduleVisibleToAll?: boolean;
  /** Category list for the shared shopping list, parent-managed; absent/empty = the built-in default categories. */
  shoppingCategories?: string[];
  /** memberId -> nav hrefs hidden from that (non-parent) member; absent/empty = everything shown. Parents always see every card themselves regardless of this. */
  hiddenNavHrefsByMember?: Record<string, string[]>;
  /** Whether children are locked out of the whole app during childCurfewStartHour-childCurfewEndHour; absent = disabled. Never applies to a parent. */
  childCurfewEnabled?: boolean;
  /** Hour (0-23) the curfew starts, in family-zone local time; absent = 22. */
  childCurfewStartHour?: number;
  /** Hour (0-23) the curfew ends, in family-zone local time; absent = 6. */
  childCurfewEndHour?: number;
  /** Whether the "Demo investování" paper-trading section is shown on the Investice card; absent = disabled. */
  investDemoEnabled?: boolean;
  /** Starting virtual cash (CZK) a new member's demo portfolio is created with; absent = the built-in default (see lib/invest-demo.ts). */
  investDemoStartingBalance?: number;
  /**
   * Whether a parent has saved a Gemini API key for "AI otázky" — a plain
   * boolean flag only, never the key itself (that lives server-only in
   * families/{familyId}/secrets/gemini, which has no client-facing
   * Firestore rule at all). Lets Settings/the practice page show "klíč je
   * nastaven" without ever reading the actual secret back to a client.
   */
  geminiApiKeyConfigured?: boolean;
  /** Same idea as geminiApiKeyConfigured, for an OpenRouter key — see families/{familyId}/secrets/openrouter. */
  openRouterApiKeyConfigured?: boolean;
  /** Minutes of free Rádio/TV playback before billing starts; absent = the built-in default (see lib/media-billing.ts). */
  mediaGracePeriodMinutes?: number;
  /** XP charged per started 5-minute block after the grace period, per kind; absent = the built-in defaults (see lib/media-billing.ts). */
  mediaXpCostPerBlock?: { radio: number; tv: number };
  /** The chosen OpenRouter model id (e.g. "openai/gpt-4o-mini") — not a secret, safe to read directly, unlike the key itself. */
  openRouterModel?: string;
  /**
   * Per-notification-type on/off + optional recipient allowlist, parent-
   * configured in Settings (see NotificationSettingsPanel). A missing
   * entry for a type means enabled, default audience. `recipientIds`
   * only ever narrows that type's natural audience (e.g. "parents" for
   * task_submitted) down to a subset — it can never add a recipient who
   * wouldn't otherwise be eligible, so this can't be used to route a
   * parent-only notification to a child. See functions/src/notifyHelpers.ts's
   * notifyMembers, which resolves this on every send. Does not cover the
   * evening reminder (its own eveningReminderEnabled field, unchanged) or
   * the AI otázky test notification (deliberately unfiltered — it's a
   * device self-check, not a real event).
   */
  notificationSettings?: Partial<Record<NotificationTypeId, { enabled?: boolean; recipientIds?: string[] }>>;
}

/**
 * Every event-driven push this app sends, keyed for
 * Family.notificationSettings and functions/src/notifyHelpers.ts's
 * notifyMembers. Types whose natural audience is always exactly one
 * person (task_decided, marketplace_offer, investment_matured) support
 * the enabled/disabled toggle but not a recipient allowlist — there's
 * nobody else in the audience to narrow.
 */
export type NotificationTypeId =
  | "task_submitted"
  | "task_decided"
  | "task_proposal"
  | "task_request"
  | "xp_adjustment"
  | "pooled_contribution"
  | "reward_redemption"
  | "marketplace_offer"
  | "investment_matured"
  | "weekly_digest"
  | "invest_demo_round_started"
  | "invest_demo_contest_settled"
  | "shopping_item_added"
  | "shopping_item_checked"
  // Not exposed in the Settings notification-preferences list — it already
  // has its own dedicated eveningReminderEnabled toggle (checked before
  // notifyMembers is even called), kept separate to avoid two conflicting
  // on/off switches for the same thing.
  | "evening_reminder";

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
  /**
   * Stations/channels this member has hearted on the Rádio/TV tabs — a full
   * snapshot of each RadioStation/TvChannel (not just its id) so favorites
   * still show without a fresh Radio Browser/IPTV-org lookup, since there's
   * no per-user favorites collection for something this lightweight and
   * purely personal.
   */
  favoriteRadioStations?: RadioStation[];
  favoriteTvChannels?: TvChannel[];
  /** UI language for this member specifically (not shared family-wide, like nav style) — absent = Czech. */
  locale?: "cs" | "en";
  /** Personal-best scores for the no-XP arcade games (components/GamesArcade.tsx) — self-written by the member, read by the whole family for the Vzdělání → Hry leaderboard. */
  gameHighScores?: { duo?: number; hex?: number; stack?: number };
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

export type LongTermGoalStatus = "active" | "achieved" | "abandoned";

/**
 * families/{familyId}/longTermGoals/{id} — a long-running aspiration that
 * spans days/weeks/months rather than something completed in a single day
 * (e.g. "dostat se na gymnázium" tracked loosely against total XP).
 * Deliberately separate from taskTemplates/dailyTasks: it's never "missed",
 * never factors into streaks or a day's completion status, and awards no
 * XP of its own — targetXp (if set) is only a milestone to compare against
 * the member's own xpBalance for a progress bar, nothing is deducted or
 * granted when it's reached. Only a parent can create/edit/delete one;
 * every family member can read (so the assigned member sees their own
 * progress).
 */
export interface LongTermGoal {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  createdAt: number;
  /** Optional milestone — progress is read live from the member's current xpBalance, never snapshotted or tracked separately here. */
  targetXp?: number;
  /** Optional target date (YYYY-MM-DD) shown as a plain reminder — nothing happens automatically when it passes. */
  deadline?: string;
  status: LongTermGoalStatus;
  achievedAt?: number;
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
 * A peer-to-peer XP trade between two family members — part of the Shop,
 * separate from the system-funded Reward catalog above. XP isn't created
 * here, only moved: on acceptance it's debited from the payer's balance and
 * credited to the earner's, net zero for the family as a whole.
 *
 * kind 'offer': proposedBy will perform the service — targetUserId pays.
 * kind 'request': proposedBy wants the service done — proposedBy pays.
 *
 * pending -> accepted (XP transfers) | declined. Whoever did *not* set
 * currentXp last (tracked via lastActionBy) is the only one who can accept,
 * decline, or counter with a different amount next — a counter flips whose
 * turn it is, same shape as a real back-and-forth negotiation.
 */
export type MarketplaceOfferKind = "offer" | "request";
export type MarketplaceOfferStatus = "pending" | "accepted" | "declined";

export interface MarketplaceOffer {
  id: string;
  kind: MarketplaceOfferKind;
  title: string;
  proposedBy: string;
  targetUserId: string;
  /** The proposer's original ask — never changes, shown alongside currentXp once it's been countered. */
  suggestedXp: number;
  /** The amount currently on the table — what accepting right now would transfer. */
  currentXp: number;
  lastActionBy: string;
  status: MarketplaceOfferStatus;
  timestamp: number;
  updatedAt: number;
}

/**
 * pending -> approved (a single parent's approval is enough — a Cloud
 * Function then creates the real, active taskTemplate) | rejected (any one
 * other member can veto outright). The proposer can't vote on their own
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
  /**
   * Date (YYYY-MM-DD, family zone) the request was (re)opened — a one-shot,
   * same-day ask, not a standing one. Both the client (treats a request
   * dated before today as no longer "open") and the daily cron (cancels any
   * still-open request older than today, same sweep that marks stale
   * dailyTasks 'missed') use this so an unanswered request never silently
   * carries over to the next day.
   */
  date: string;
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

/**
 * families/{familyId}/investDemoPortfolios/{userId} — a member's paper-
 * trading account: virtual CZK cash plus a holdings/transactions
 * subcollection each. Only ever written by trusted server code (the
 * buy/sell Cloud Functions in functions/src/investDemo.ts, Admin SDK
 * bypasses rules) — same trust model as xpBalance, since a client-writable
 * cash balance would make every trade a free cheat.
 */
export interface InvestDemoPortfolio {
  cashBalance: number;
  createdAt: number;
  /**
   * Account value at the start of the current monthly contest round — see
   * functions/src/investDemo.ts's investDemoContestReset, which snapshots
   * this (as the post-liquidation cashBalance, since every portfolio is
   * fully cash by then) for every portfolio right after settlement, and
   * initInvestDemoPortfolio, which sets it at creation for anyone who joins
   * mid-round. Used only to gate contest payout — see
   * rankContestParticipants in lib/invest-demo.ts — not for ranking itself.
   * Absent only for a portfolio that predates this field; treat as
   * cashBalance.
   */
  roundStartCzk?: number;
  roundStartAt?: number;
  /**
   * Cash + holdings at live prices, in CZK — refreshed 4x/day by
   * functions/src/investDemo.ts's investDemoValuationRefresh (00:00/06:00/
   * 12:00/18:00 Europe/Prague), plus set at creation. The leaderboard
   * (components/InvestDemoLeaderboard.tsx) reads this directly rather than
   * fetching live quotes itself on every view. Absent only for a portfolio
   * that predates this field; treat as cashBalance.
   */
  totalValueCzk?: number;
  valuedAt?: number;
}

export interface InvestDemoHolding {
  symbol: string;
  name: string;
  assetType: InvestDemoAssetType;
  quantity: number;
  /** Weighted-average purchase price per unit, in CZK. */
  avgCostCzk: number;
}

export interface InvestDemoTransaction {
  id: string;
  symbol: string;
  name: string;
  assetType: InvestDemoAssetType;
  side: "buy" | "sell";
  quantity: number;
  /** Price per unit at execution time, converted to CZK. */
  priceCzk: number;
  totalCzk: number;
  timestamp: number;
}

export interface InvestDemoContestStanding {
  userId: string;
  totalValueCzk: number;
  xpAwarded: number;
}

/**
 * families/{familyId}/investDemoContestResults/{roundKey} (roundKey =
 * YYYY-MM, family zone) — the settled outcome of one month's "kdo má
 * nejlepší zhodnocení" demo-investing contest (functions/src/investDemo.ts's
 * investDemoContestSettle, last day of the month 20:00). Server-written
 * only, same trust tier as xpLedger — it's both the historical record and
 * what actually decided the XP awards in `standings`.
 */
export interface InvestDemoContestResult {
  id: string;
  settledAt: number;
  standings: InvestDemoContestStanding[];
}

export type ChatAttachmentType = "image" | "video" | "audio" | "file";

/** Uploaded to Firebase Storage under families/{familyId}/chatAttachments/{uid}/{fileId} before the message doc is written — see firestore.rules' messages match. */
export interface ChatAttachment {
  type: ChatAttachmentType;
  url: string;
  /** Original filename — shown for `type: "file"` since there's no inline preview for it. */
  name?: string;
  /** Voice-message playback length in seconds, `type: "audio"` only. */
  durationSeconds?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  /** May be empty when the message is attachment-only (a photo with no caption, etc.). */
  text: string;
  timestamp: number;
  attachment?: ChatAttachment;
}

/**
 * families/{familyId}/triviaDuels/{duelId} — the client-readable summary of
 * a head-to-head quiz challenge between two members. The actual questions
 * (and each side's live in-progress score) live server-only in
 * triviaDuelState/{duelId} — see functions/src/triviaDuel.ts — so a player
 * can't peek at the questions or the opponent's running score before it's
 * their turn/before the duel is settled.
 */
export interface TriviaDuel {
  id: string;
  challengerId: string;
  challengerStake: number;
  opponentId: string;
  /** Set once the opponent accepts — absent while still pending_acceptance. */
  opponentStake?: number;
  status: TriviaDuelStatus;
  questionCount: number;
  createdAt: number;
  respondedAt?: number;
  completedAt?: number;
  /** Only populated once status is 'completed'. */
  challengerScore?: number;
  opponentScore?: number;
  /** userId of the winner, or 'tie' — only once completed. */
  winnerId?: string;
}

/**
 * A visibility log for actions parents can take on other members' behalf or
 * that change family-wide state — not a security boundary (entries are
 * self-attested by the client, same trust tier as `messages`), just an
 * answer to "kdo to udělal a kdy" when something looks off. Read-only for
 * parents; append-only, never edited or deleted.
 */
export type AuditAction =
  | "member_added"
  | "member_role_changed"
  | "member_removed"
  | "xp_adjustment_decided"
  | "task_approved"
  | "task_returned"
  | "task_completion_reverted"
  | "task_template_deleted"
  | "reward_redemption_decided"
  | "pooled_contribution_decided"
  | "chat_cleared"
  | "photos_cleared"
  | "audit_log_cleared"
  | "investment_deleted";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: AuditAction;
  /** Human-readable detail, e.g. the affected member's or task's name. */
  detail: string;
  timestamp: number;
}

export type CalendarEventCategory = "doctor" | "birthday" | "holiday" | "vacation" | "other";

/** How an event repeats — 'none' (or absent) is a one-off, everything else recurs forever from `date` onward. */
export type CalendarRecurrence = "none" | "weekly" | "monthly" | "yearly";

/**
 * A plain reminder on the family's planning calendar — doctor visits,
 * birthdays, holidays, vacations, anything worth remembering that isn't a
 * chore. Deliberately separate from taskTemplates/dailyTasks: it never
 * awards XP and never needs approval, it's just a note on a day. A parent
 * can add one for any family member; anyone else can only ever add one for
 * themselves.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  /** Date (YYYY-MM-DD, family zone) the event falls on. */
  date: string;
  /** Optional clock time (HH:MM, 24h, family zone) — absent means an all-day reminder. */
  time?: string;
  category: CalendarEventCategory;
  /** Whose day this shows up on. */
  memberId: string;
  createdBy: string;
  timestamp: number;
  /** Repeat rule from `date` onward; absent = one-off ('none'). */
  recurrence?: CalendarRecurrence;
  /**
   * Only meaningful when recurrence is 'weekly' — which weekdays it recurs
   * on, Monday-indexed (0=Po..6=Ne, matching WEEKDAYS in the calendar page).
   * Absent/empty means the traditional single-weekday behavior: whatever
   * weekday `date` itself falls on.
   */
  daysOfWeek?: number[];
  /** Last date (YYYY-MM-DD, inclusive) a recurring event still applies; absent = repeats forever. Ignored when recurrence is 'none'. */
  recurrenceUntil?: string;
  /**
   * Last date (YYYY-MM-DD, inclusive) of a multi-day span starting at
   * `date` — a vacation running straight through, not a repeat pattern.
   * Only meaningful when recurrence is 'none'/absent; a recurring event
   * ignores it.
   */
  endDate?: string;
}

/** One period's cell in a ClassSchedule — a subject name plus an optional teacher name. */
export interface ScheduleCell {
  subject: string;
  teacher?: string;
}

/**
 * families/{familyId}/schedules/{memberId} — one member's weekly class
 * timetable. `days[0]` is Monday .. `days[4]` is Friday; each is an ordered
 * list of cells for periods 1..N (an empty subject means no lesson that
 * period; see SCHEDULE_PERIOD_TIMES in lib/schedule.ts for each period's
 * fixed start/end time, shown but not stored per schedule). Doc ID is the
 * member's own uid, so there's naturally at most one schedule per member. A
 * parent can always see (and edit) every child's; a non-parent always
 * sees/edits their own, and — only if a parent has turned on
 * family.scheduleVisibleToAll — everyone else's too.
 */
export interface ClassSchedule {
  memberId: string;
  /**
   * Keyed by day index as a string ("0".."4") rather than a plain
   * ScheduleCell[][] — Firestore rejects an array whose elements are
   * themselves arrays ("nested arrays are not supported"), so this is the
   * on-disk shape. See lib/schedule.ts for the ScheduleCell[][] <-> map
   * conversion used at the UI boundary. A cell may still be a bare string
   * on a schedule saved before teacher names existed — normalizeScheduleDays
   * upgrades it to { subject: thatString } on read.
   */
  days: Record<string, (ScheduleCell | string)[]>;
  updatedAt: number;
}

/**
 * families/{familyId}/shoppingItems/{id} — the family's shared shopping
 * list. Anyone can add, check off, or remove an item — a parent only
 * manages the category list (family.shoppingCategories), not who's
 * allowed to touch the list itself.
 */
export interface ShoppingItem {
  id: string;
  name: string;
  /** Defaults to 1 when absent (items added before quantity became a stepper). */
  quantity?: number;
  category: string;
  checked: boolean;
  /** Set when `checked` becomes true, cleared when unchecked — shown in the collapsed "Dokončené" section and absent for anything checked before this field existed. */
  completedAt?: number;
  /** Who last checked it off, cleared when unchecked — drives the shopping_item_checked notification (functions/src/shoppingNotifications.ts) and absent for anything checked before this field existed. */
  completedBy?: string;
  addedBy: string;
  timestamp: number;
}

export type ListKind = "wishlist" | "ideas" | "howto" | "custom";

/**
 * families/{familyId}/lists/{id} — a list living on the "Seznamy" card
 * alongside the (separately-collectioned, unchanged) shopping list. Only a
 * parent can create or delete a list; any family member can read/add/check/
 * remove its items, same permission split as the shopping list.
 */
export interface FamilyList {
  id: string;
  title: string;
  kind: ListKind;
  /** Grouping labels for items' `category` field (e.g. wishlist's occasions) — flat list (no grouping) when absent. */
  categories?: string[];
  createdBy: string;
  createdAt: number;
}

/** families/{familyId}/listItems/{id} — flat collection, each item pointing at its list via `listId` (same flat-collection convention as dailyTasks→templateId, rewardRedemptions→rewardId, etc.). */
export interface FamilyListItem {
  id: string;
  listId: string;
  name: string;
  /** Free-form elaboration — a wishlist link/size, a how-to's actual instructions. Unused by "ideas". */
  note?: string;
  /** One of the parent list's `categories`, when it has any. */
  category?: string;
  checked: boolean;
  /** Set when `checked` becomes true, cleared when unchecked — shown in the collapsed "Dokončené" section and absent for anything checked before this field existed. */
  completedAt?: number;
  addedBy: string;
  timestamp: number;
}

export type JournalKind = "food" | "training" | "custom";

/**
 * families/{familyId}/journals/{id} — a diary on the "Deníky" card (e.g. a
 * food or training log). Only a parent can create or delete one; any family
 * member can read and add their own entries.
 */
export interface Journal {
  id: string;
  title: string;
  kind: JournalKind;
  createdBy: string;
  createdAt: number;
}

/** families/{familyId}/journalEntries/{id} — flat collection, each entry pointing at its journal via `journalId`. Deleting one always goes through a JournalDeletionRequest — see below — entries are otherwise immutable once written (the author may still edit date/text). */
export interface JournalEntry {
  id: string;
  journalId: string;
  authorId: string;
  /** YYYY-MM-DD, family zone — defaults to "today" when logged, but freely backdatable. */
  date: string;
  text: string;
  timestamp: number;
}

export type JournalDeletionTargetType = "journal" | "entry";

/**
 * A parent's request to delete an entire journal (and all its entries) or
 * a single entry from one — same second-parent-approval shape as
 * XpAdjustmentRequest: requested -> approved (a *different* parent
 * approves, which is what actually performs the deletion server-side) |
 * rejected. Auto-approved on creation if the family has no second parent
 * to ever approve it. `targetLabel` is a denormalized snapshot (journal
 * title, or "<journal title> · <date> · <text preview>" for an entry) so
 * the request stays readable even after the target itself is deleted.
 */
export type JournalDeletionStatus = "requested" | "approved" | "rejected";

export interface JournalDeletionRequest {
  id: string;
  targetType: JournalDeletionTargetType;
  targetId: string;
  targetLabel: string;
  requestedBy: string;
  status: JournalDeletionStatus;
  timestamp: number;
}

/**
 * families/{familyId}/adHocTaskTypes/{id} — a parent-defined irregular
 * ("jednorázový") task that doesn't fit a daily recurrence, e.g. emptying
 * the dishwasher — done on demand rather than scheduled, with a per-type
 * cooldown so it can't be marked done again (re-awarding XP) before it
 * plausibly needs doing again.
 */
export interface AdHocTaskType {
  id: string;
  title: string;
  xpValue: number;
  /** Minimum minutes between two completions of this type (family-wide) before it's available again. */
  cooldownMinutes: number;
  active: boolean;
  /** When true, completing this type requires a proof photo — same idea as taskTemplates.photoRequired. */
  photoRequired?: boolean;
}

/**
 * approved is the terminal "XP has been credited" state — reached either
 * instantly (a type with no photoRequired is self-service, no review
 * needed) or once a parent approves a pending photo. pending only exists
 * for a photoRequired type awaiting that decision; rejected is terminal
 * too, XP never moves. Absent on completions written before this field
 * existed — treat a missing status the same as 'approved' (they already
 * had XP credited at creation time, back when every completion did).
 */
export type AdHocCompletionStatus = "pending" | "approved" | "rejected";

/**
 * families/{familyId}/adHocCompletions/{id} — append-only log of completed
 * ad-hoc tasks. Only ever created by the completeAdHocTask Cloud Function
 * (same trust tier as xpLedger) — the client's only write access is a
 * parent flipping a 'pending' completion to 'approved'/'rejected' (see
 * firestore.rules), which functions/src/onAdHocCompletionDecided.ts then
 * turns into the actual XP award, mirroring dailyTasks' submitted->done
 * approval flow. It's both the XP award record and the source of truth
 * for "when was this type last done" that the server-side cooldown check
 * and the client's countdown display both read from — regardless of
 * status, so a rejected claim still occupies the cooldown window.
 */
export interface AdHocTaskCompletion {
  id: string;
  typeId: string;
  completedBy: string;
  timestamp: number;
  /** XP actually credited so far — 0 while pending or rejected. */
  xpAwarded: number;
  photoUrl?: string;
  status?: AdHocCompletionStatus;
  decidedBy?: string;
  decidedAt?: number;
}

/**
 * families/{familyId}/practiceProgress/{uid} — which Vzdělání exercises
 * this member has already answered correctly, per subject, so the same
 * question is never asked again and progress ("12/30 zvládnuto") can be
 * shown to both the member and their parents. Server-authoritative — only
 * generatePracticeProblem/submitPracticeAnswer/englishFlashcards Cloud
 * Functions ever write it, same trust tier as xpLedger.
 */
export interface PracticeProgress {
  id: string;
  math?: string[];
  czech?: string[];
  prirodoveda?: string[];
  vlastiveda?: string[];
  english?: string[];
  atlas?: string[];
  finance?: string[];
  ai?: string[];
  digisafety?: string[];
  dictionary?: string[];
}

export type PenaltyTaskStatus = "pending" | "resolved";

/**
 * families/{familyId}/penaltyTasks/{id} — a parent-issued "do this or you
 * lose XP" warning for something repeatedly ignored (e.g. "clean your
 * room, I've told you three times"). If not resolved by a parent within
 * `deadlineHours` of creation, every assigned member loses `penaltyXp`;
 * after that they keep losing `recurringXp` every further
 * `recurringIntervalHours` until a parent resolves it. An assigned member
 * submitting (optionally with a photo) only flags "please check this" for
 * a parent — it never stops the deduction by itself; only a parent's
 * confirmation (status -> 'resolved') does.
 */
export interface PenaltyTask {
  id: string;
  title: string;
  assignedTo: string[];
  createdBy: string;
  createdAt: number;
  deadlineHours: number;
  penaltyXp: number;
  recurringXp: number;
  recurringIntervalHours: number;
  status: PenaltyTaskStatus;
  /** How many penalty "units" (the initial deadline miss + each elapsed recurring interval) have already been deducted. Server-authoritative — never client-writable. */
  penaltiesApplied: number;
  resolvedAt?: number;
  resolvedBy?: string;
  /** Set by an assigned member saying "I think I did it" — cosmetic only, never stops the deduction by itself. */
  submittedAt?: number;
  photoUrl?: string;
}

/**
 * families/{familyId}/weeklyDigests/{weekKey} — an AI-written recap of the
 * past 7 days (functions/src/weeklyDigest.ts, Sunday 18:00 cron), server-
 * only written. `weekKey`/`weekStart`/`weekEnd` are YYYY-MM-DD date keys in
 * family-zone time.
 */
export interface WeeklyDigest {
  text: string;
  weekStart: string;
  weekEnd: string;
  stats: { name: string; tasksCompleted: number; xpEarned: number; currentStreak: number }[];
  generatedAt: number;
}

/**
 * families/{familyId}/notifications/{id} — an in-app log of every push this
 * app has sent, one doc per recipient (functions/src/notifyHelpers.ts's
 * notifyMembers writes one alongside the actual FCM send, whether or not
 * that recipient has a push token — this is what drives the unread-count
 * badge on the header avatar, independent of whether push is even enabled
 * on the device). `read` is the one field a member may flip on their own
 * doc (see firestore.rules); everything else is server-only.
 */
export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
}

/**
 * won/lost are always from the human's perspective — the AI has no XP or
 * feelings to speak of. 'in_progress' is the only status submitChessMove
 * accepts a move against; every other status means the game is over and a
 * fresh startChessGame call is needed to play that difficulty again.
 */
export type ChessGameStatus = "in_progress" | "won" | "lost" | "draw" | "resigned";

/**
 * families/{familyId}/chessGames/{gameId} — one game per member per
 * difficulty (gameId = `${userId}_${difficulty}`), so starting a new game
 * for a difficulty simply overwrites any prior finished one rather than
 * accumulating abandoned games. Server-authoritative — only
 * functions/src/chess.ts writes it; the client only ever sends
 * from/to/promotion and reads back the resulting position. `history` is
 * the SAN move list (human and AI moves interleaved) for display only.
 */
export interface ChessGame {
  id: string;
  userId: string;
  difficulty: ChessDifficulty;
  fen: string;
  history: string[];
  status: ChessGameStatus;
  /** Total XP actually credited across every win of this game doc's lifetime — 0/absent if the daily cap for this difficulty was already spent on a prior win today. */
  xpAwarded?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * families/{familyId}/chessProgress/{userId} — tracks the last date (family
 * zone) each difficulty's win XP was already claimed, so a member can keep
 * playing/winning for fun but only earns the CHESS_WIN_XP reward once per
 * difficulty per day (functions/src/chess.ts). Doc ID is the member's own uid.
 */
export interface ChessProgress {
  id: string;
  lastWinDateByDifficulty?: Partial<Record<ChessDifficulty, string>>;
}

/**
 * families/{familyId}/childProfiles/{id} — a lightweight profile for a
 * child who isn't (yet, or ever) a registered app user, e.g. a toddler
 * sibling. Exists only so a real-money account (see MoneyAccountEntry) has
 * someone to belong to — no auth, no XP, no tasks; a parent is the only one
 * who can ever see or manage it, since the child has no login to view it
 * with themselves.
 */
export interface ChildProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  createdBy: string;
  createdAt: number;
}

export type MoneyEntryType = "income" | "expense";

/**
 * families/{familyId}/moneyAccounts/{ownerId}/entries/{id} — a real (not
 * XP) money ledger a parent keeps for a child's own money, `ownerId` being
 * either an existing member's uid (a registered child) or a ChildProfile id
 * (an unregistered one). Only ever written by a parent — this is the
 * child's own money, but they're not the one operating the account, same
 * as a real bank account a parent manages on a minor's behalf. The balance
 * is always the sum of every entry (income positive, expense negative),
 * never stored/cached separately, so it can never drift out of sync — see
 * lib/money.ts's sumMoneyEntries.
 */
export interface MoneyAccountEntry {
  id: string;
  type: MoneyEntryType;
  /** Always positive — sign is implied by `type`. */
  amount: number;
  description: string;
  createdBy: string;
  timestamp: number;
}

/**
 * families/{familyId}/aiTutorMessages/{uid}/messages/{id} — one member's
 * "AI učitel" conversation log (see functions/src/aiTutor.ts's askAiTutor,
 * lib/ai-tutor.ts for the prompt logic). Personal, not shared with
 * siblings — a parent can still read a child's for oversight, same as
 * money accounts. Admin-SDK-only writes: the Cloud Function writes both
 * the user's question and the assistant's reply together, since the
 * reply's text only exists after the AI call succeeds.
 */
export interface AiTutorMessage {
  id: string;
  /** Groups messages into a conversation thread client-side (filtered in JS, not queried) — switching subject starts a fresh thread rather than mixing context. */
  subject: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}
