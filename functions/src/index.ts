import { initializeApp } from "firebase-admin/app";

initializeApp();

export { dailyTaskGenerator } from "./dailyTaskGenerator";
export { sendReminders } from "./sendReminders";
export { createFamily, joinFamily } from "./family";
export { onTaskCompleted } from "./onTaskCompleted";
export { onRedemptionApproved } from "./onRedemptionApproved";
export { onTaskTemplateWritten } from "./onTaskTemplateWritten";
export { onXpAdjustmentRequestWritten } from "./xpAdjustments";
export { onTaskProposalWritten } from "./taskProposals";
export { onPooledContributionWritten } from "./pooledContributions";
