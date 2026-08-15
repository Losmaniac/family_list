import { describe, expect, it } from "vitest";
import { FIREBASE_STORAGE_FREE_TIER_GB, formatBytes, storageUsagePercent, summarizeUploadsToday } from "./storage-usage";

describe("formatBytes", () => {
  it("formats bytes under 1 KB as bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes, megabytes, and gigabytes", () => {
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1,5 GB");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("storageUsagePercent", () => {
  it("computes the percentage of the free tier used", () => {
    const halfFreeTier = (FIREBASE_STORAGE_FREE_TIER_GB / 2) * 1024 ** 3;
    expect(storageUsagePercent(halfFreeTier)).toBe(50);
  });

  it("caps at 100 for usage over the free tier", () => {
    const overFreeTier = (FIREBASE_STORAGE_FREE_TIER_GB + 10) * 1024 ** 3;
    expect(storageUsagePercent(overFreeTier)).toBe(100);
  });

  it("returns 0 for no usage", () => {
    expect(storageUsagePercent(0)).toBe(0);
  });
});

describe("summarizeUploadsToday", () => {
  const now = new Date("2026-03-15T12:00:00Z"); // noon UTC = safely mid-day in Europe/Prague too

  it("counts only files created on the same family-zone day as now", () => {
    const stats = summarizeUploadsToday(
      [
        { bytes: 100, timeCreated: "2026-03-15T08:00:00Z" }, // today
        { bytes: 200, timeCreated: "2026-03-15T22:30:00Z" }, // still today in Prague (UTC+1, CET in March)
        { bytes: 300, timeCreated: "2026-03-14T10:00:00Z" }, // yesterday
      ],
      now
    );
    expect(stats).toEqual({ count: 2, bytes: 300 });
  });

  it("returns zero counts for no files", () => {
    expect(summarizeUploadsToday([], now)).toEqual({ count: 0, bytes: 0 });
  });

  it("returns zero counts when nothing was uploaded today", () => {
    const stats = summarizeUploadsToday([{ bytes: 100, timeCreated: "2026-01-01T10:00:00Z" }], now);
    expect(stats).toEqual({ count: 0, bytes: 0 });
  });
});
