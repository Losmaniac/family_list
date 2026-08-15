/** Pure helpers for the family chat's attachments. */

/**
 * Must match the byte literal in storage.rules' chatAttachments match block
 * — that rule is the actual enforcement (a client can't be trusted to
 * self-police), this constant only lets the client reject an oversized
 * file immediately instead of after a full (possibly slow, especially for
 * video) upload that would fail at the very end anyway once Storage
 * evaluates the rule on finalize.
 */
export const MAX_CHAT_ATTACHMENT_BYTES = 150 * 1024 * 1024;

export function formatFileSizeMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
