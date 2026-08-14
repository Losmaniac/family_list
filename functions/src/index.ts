import { initializeApp } from "firebase-admin/app";

initializeApp();

export { dailyTaskGenerator } from "./dailyTaskGenerator";
export { sendReminders } from "./sendReminders";
export { createFamily, joinFamily } from "./family";
export { onTaskCompleted, reconcileTaskXpSweep } from "./onTaskCompleted";
export { onRedemptionApproved } from "./onRedemptionApproved";
export { onTaskTemplateWritten } from "./onTaskTemplateWritten";
export { onXpAdjustmentRequestWritten } from "./xpAdjustments";
export { onJournalDeletionRequestWritten } from "./journalDeletions";
export { onTaskProposalWritten } from "./taskProposals";
export { onPooledContributionWritten } from "./pooledContributions";
export { onInvestmentWritten, maturedInvestmentsPayout, reconcileInvestmentSweep } from "./investments";
export { onTaskStatusNotify } from "./taskNotifications";
export { sendTestNotification } from "./notifications";
export { generatePracticeProblem, submitPracticeAnswer, getPracticeCapStatus, giveUpPracticeProblem } from "./practice";
export { onMarketplaceOfferWritten } from "./marketplace";
export { chargeMediaListening } from "./mediaBilling";
export { startChessGame, submitChessMove, resignChessGame } from "./chess";
export { generateEnglishFlashcards, submitEnglishFlashcardAnswer } from "./englishFlashcards";
export { generateSpanishFlashcards, submitSpanishFlashcardAnswer } from "./spanishFlashcards";
export { completeAdHocTask } from "./adHocTasks";
export { onAdHocCompletionDecided } from "./onAdHocCompletionDecided";
export {
  searchInvestDemoAssets,
  initInvestDemoPortfolio,
  buyInvestDemoAsset,
  sellInvestDemoAsset,
  getInvestDemoQuotes,
  investDemoContestSettle,
  investDemoContestReset,
  investDemoValuationRefresh,
} from "./investDemo";
export { onShoppingItemWritten } from "./shoppingNotifications";
export {
  createTriviaDuel,
  respondToTriviaDuel,
  cancelTriviaDuel,
  getTriviaDuelQuestion,
  submitTriviaDuelAnswer,
} from "./triviaDuel";
export { setGeminiApiKey, setOpenRouterConfig, generateAiQuizQuestion, submitAiQuizAnswer } from "./aiQuiz";
export { askAiTutor } from "./aiTutor";
export { weeklyDigestGenerator } from "./weeklyDigest";
export { penaltyTaskSweep } from "./penaltyTasks";
export {
  onTaskProposalCreated,
  onTaskRequestOpened,
  onXpAdjustmentRequestCreated,
  onPooledContributionCreated,
  onRewardRedemptionActionable,
  onMarketplaceOfferActionable,
} from "./actionNotifications";
