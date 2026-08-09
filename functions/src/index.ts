import { initializeApp } from "firebase-admin/app";

initializeApp();

export { dailyTaskGenerator } from "./dailyTaskGenerator";
export { sendReminders } from "./sendReminders";
export { createFamily, joinFamily } from "./family";
export { onTaskCompleted, reconcileTaskXpSweep } from "./onTaskCompleted";
export { onRedemptionApproved } from "./onRedemptionApproved";
export { onTaskTemplateWritten } from "./onTaskTemplateWritten";
export { onXpAdjustmentRequestWritten } from "./xpAdjustments";
export { onTaskProposalWritten } from "./taskProposals";
export { onPooledContributionWritten } from "./pooledContributions";
export { onInvestmentWritten, maturedInvestmentsPayout, reconcileInvestmentSweep } from "./investments";
export { onTaskStatusNotify } from "./taskNotifications";
export { sendTestNotification } from "./notifications";
export { generatePracticeProblem, submitPracticeAnswer, getPracticeCapStatus } from "./practice";
export { onMarketplaceOfferWritten } from "./marketplace";
export { generateEnglishFlashcards, submitEnglishFlashcardAnswer } from "./englishFlashcards";
export { completeAdHocTask } from "./adHocTasks";
export { penaltyTaskSweep } from "./penaltyTasks";
export {
  onTaskProposalCreated,
  onTaskRequestOpened,
  onXpAdjustmentRequestCreated,
  onPooledContributionCreated,
  onRewardRedemptionActionable,
  onMarketplaceOfferActionable,
} from "./actionNotifications";
