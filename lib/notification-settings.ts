/**
 * Pure helper for applying a family's parent-configured notification
 * preferences (Family.notificationSettings) to a notification's natural
 * (default) recipient list. Kept dependency-free so it's unit-testable
 * without Firestore — functions/src/notifyHelpers.ts's notifyMembers is
 * the only caller that actually sends anything.
 */
import type { Family, NotificationTypeId } from "./types";

export interface NotifyTargetLike {
  userId: string;
}

/**
 * Filters out the whole type if a parent disabled it, otherwise narrows to
 * `recipientIds` when set — this only ever removes people from the natural
 * audience, never adds anyone, so it can't be used to route a parent-only
 * notification (e.g. reward_redemption) to a child who was never eligible.
 */
export function applyNotificationSettings<T extends NotifyTargetLike>(
  settings: Family["notificationSettings"] | undefined,
  typeId: NotificationTypeId,
  naturalTargets: T[]
): T[] {
  const typeSettings = settings?.[typeId];
  if (typeSettings?.enabled === false) return [];
  if (typeSettings?.recipientIds && typeSettings.recipientIds.length > 0) {
    const allow = new Set(typeSettings.recipientIds);
    return naturalTargets.filter((t) => allow.has(t.userId));
  }
  return naturalTargets;
}

/** Every NotificationTypeId a parent can actually see/configure in Settings — excludes "evening_reminder" (see its own type comment in lib/types.ts). */
type ConfigurableNotificationTypeId = Exclude<NotificationTypeId, "evening_reminder">;

export const NOTIFICATION_TYPE_ORDER: ConfigurableNotificationTypeId[] = [
  "task_submitted",
  "task_decided",
  "task_proposal",
  "task_request",
  "xp_adjustment",
  "pooled_contribution",
  "reward_redemption",
  "marketplace_offer",
  "investment_matured",
  "weekly_digest",
  "invest_demo_round_started",
  "invest_demo_contest_settled",
  "shopping_item_added",
  "shopping_item_checked",
  "chat_message",
];

interface NotificationTypeInfo {
  label: string;
  audienceLabel: string;
  hasRecipientChoice: boolean;
  /** Which members are worth offering as recipient checkboxes — a choice outside this type's real audience is a harmless no-op (applyNotificationSettings only ever narrows the natural audience), just confusing to offer. Ignored when hasRecipientChoice is false. */
  audienceFilter: "parents" | "all";
}

export const NOTIFICATION_TYPE_INFO: Record<ConfigurableNotificationTypeId, NotificationTypeInfo> = {
  task_submitted: { label: "Úkol odeslán ke schválení", audienceLabel: "Rodiče", hasRecipientChoice: true, audienceFilter: "parents" },
  task_decided: { label: "Úkol schválen nebo vrácen", audienceLabel: "Ten, kdo úkol odeslal", hasRecipientChoice: false, audienceFilter: "all" },
  task_proposal: { label: "Návrh nového úkolu", audienceLabel: "Ostatní členové", hasRecipientChoice: true, audienceFilter: "all" },
  task_request: { label: "Žádost o nový úkol", audienceLabel: "Ostatní členové", hasRecipientChoice: true, audienceFilter: "all" },
  xp_adjustment: { label: "Žádost o schválení úpravy XP", audienceLabel: "Ostatní rodiče", hasRecipientChoice: true, audienceFilter: "parents" },
  pooled_contribution: { label: "Pozvánka do sbírky na odměnu", audienceLabel: "Pozvaní členové", hasRecipientChoice: true, audienceFilter: "all" },
  reward_redemption: { label: "Žádost o odměnu", audienceLabel: "Rodiče", hasRecipientChoice: true, audienceFilter: "parents" },
  marketplace_offer: { label: "Nabídka/poptávka na trhu služeb", audienceLabel: "Druhá strana obchodu", hasRecipientChoice: false, audienceFilter: "all" },
  investment_matured: { label: "Investice dozrála", audienceLabel: "Ten, komu investice patří", hasRecipientChoice: false, audienceFilter: "all" },
  weekly_digest: { label: "Týdenní AI souhrn", audienceLabel: "Všichni členové", hasRecipientChoice: true, audienceFilter: "all" },
  invest_demo_round_started: { label: "Nové kolo demo investování", audienceLabel: "Kdo má demo portfolio", hasRecipientChoice: true, audienceFilter: "all" },
  invest_demo_contest_settled: { label: "Vyhodnocení soutěže demo investování", audienceLabel: "Kdo má demo portfolio", hasRecipientChoice: true, audienceFilter: "all" },
  shopping_item_added: { label: "Přidaná položka do nákupního seznamu", audienceLabel: "Ostatní členové", hasRecipientChoice: true, audienceFilter: "all" },
  shopping_item_checked: { label: "Odškrtnutá položka z nákupního seznamu", audienceLabel: "Ostatní členové", hasRecipientChoice: true, audienceFilter: "all" },
  chat_message: { label: "Nová zpráva v rodinném chatu", audienceLabel: "Ostatní členové", hasRecipientChoice: true, audienceFilter: "all" },
};
