/** Pure helpers for the Settings "Úložiště" (Firebase Storage usage) panel. */
import { dateKeyInFamilyZone } from "./date-utils";

/** Firebase's published no-cost Cloud Storage quota — applies whether the project is on Spark or Blaze; Blaze just allows paying for usage beyond it instead of hard-blocking uploads. */
export const FIREBASE_STORAGE_FREE_TIER_GB = 5;
export const FIREBASE_STORAGE_FREE_UPLOAD_OPS_PER_DAY = 20_000;
export const FIREBASE_STORAGE_FREE_DOWNLOAD_GB_PER_DAY = 1;
export const FIREBASE_STORAGE_FREE_DOWNLOAD_OPS_PER_DAY = 50_000;

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

export interface StorageFileStat {
  bytes: number;
  /** Firebase Storage object metadata's `timeCreated`, an ISO 8601 string. */
  timeCreated: string;
}

export interface DailyUploadStats {
  count: number;
  bytes: number;
}

/**
 * How many files (and how many bytes) were uploaded "today" (family zone),
 * approximating Firebase's own daily-upload-operation count from data this
 * panel already fetches anyway (each file's creation timestamp) — there's
 * no client-readable API for the actual operation count itself, this is
 * the closest honest substitute (a retried/failed upload could count as
 * more operations than files, but that's a minor discrepancy, not a
 * fabricated number).
 */
export function summarizeUploadsToday(files: StorageFileStat[], now: Date = new Date()): DailyUploadStats {
  const todayKey = dateKeyInFamilyZone(now);
  return files.reduce(
    (acc, f) =>
      dateKeyInFamilyZone(new Date(f.timeCreated)) === todayKey ? { count: acc.count + 1, bytes: acc.bytes + f.bytes } : acc,
    { count: 0, bytes: 0 }
  );
}
