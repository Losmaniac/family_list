import { describe, expect, it } from "vitest";
import { FIREBASE_STORAGE_FREE_TIER_GB, formatBytes, storageUsagePercent } from "./storage-usage";

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
