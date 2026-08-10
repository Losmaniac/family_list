import { describe, expect, it } from "vitest";
import { applyNotificationSettings, NOTIFICATION_TYPE_INFO, NOTIFICATION_TYPE_ORDER } from "./notification-settings";
import type { Family } from "./types";

const targets = [{ userId: "a" }, { userId: "b" }, { userId: "c" }];

describe("applyNotificationSettings", () => {
  it("returns the natural targets unchanged when there are no settings", () => {
    expect(applyNotificationSettings(undefined, "task_submitted", targets)).toEqual(targets);
  });

  it("returns the natural targets unchanged when the type has no explicit settings", () => {
    const settings: Family["notificationSettings"] = { task_proposal: { enabled: false } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual(targets);
  });

  it("returns nothing when the type is disabled", () => {
    const settings: Family["notificationSettings"] = { task_submitted: { enabled: false } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual([]);
  });

  it("narrows to recipientIds when set", () => {
    const settings: Family["notificationSettings"] = { task_submitted: { recipientIds: ["b"] } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual([{ userId: "b" }]);
  });

  it("never adds someone outside the natural audience, even if listed in recipientIds", () => {
    const settings: Family["notificationSettings"] = { task_submitted: { recipientIds: ["b", "someone-not-in-the-audience"] } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual([{ userId: "b" }]);
  });

  it("an empty recipientIds array is treated as no restriction, not zero recipients", () => {
    const settings: Family["notificationSettings"] = { task_submitted: { recipientIds: [] } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual(targets);
  });

  it("disabled takes priority over recipientIds", () => {
    const settings: Family["notificationSettings"] = { task_submitted: { enabled: false, recipientIds: ["b"] } };
    expect(applyNotificationSettings(settings, "task_submitted", targets)).toEqual([]);
  });
});

describe("NOTIFICATION_TYPE_ORDER / NOTIFICATION_TYPE_INFO", () => {
  it("has an info entry for every type in the order list, and vice versa", () => {
    expect(new Set(NOTIFICATION_TYPE_ORDER)).toEqual(new Set(Object.keys(NOTIFICATION_TYPE_INFO)));
  });
});
