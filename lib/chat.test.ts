import { describe, expect, it } from "vitest";
import { formatFileSizeMb, MAX_CHAT_ATTACHMENT_BYTES } from "./chat";

describe("formatFileSizeMb", () => {
  it("formats bytes as MB with one decimal place", () => {
    expect(formatFileSizeMb(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSizeMb(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});

describe("MAX_CHAT_ATTACHMENT_BYTES", () => {
  it("is a positive, generous-for-video size", () => {
    expect(MAX_CHAT_ATTACHMENT_BYTES).toBeGreaterThan(50 * 1024 * 1024);
  });
});
