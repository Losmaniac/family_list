/** Pure helpers for the Settings "Úložiště" (Firebase Storage usage) panel. */

/** Firebase's published no-cost Cloud Storage quota — applies whether the project is on Spark or Blaze; Blaze just allows paying for usage beyond it instead of hard-blocking uploads. */
export const FIREBASE_STORAGE_FREE_TIER_GB = 5;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toLocaleString("cs-CZ", { maximumFractionDigits: value < 10 ? 2 : 1 })} ${units[unitIndex]}`;
}

/** How full the free-tier storage allowance is, 0-100 (capped, never negative — a huge overage still just reads as "100 %"). */
export function storageUsagePercent(totalBytes: number): number {
  const freeBytes = FIREBASE_STORAGE_FREE_TIER_GB * 1024 ** 3;
  if (freeBytes <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((totalBytes / freeBytes) * 1000) / 10));
}
