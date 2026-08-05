import { describe, expect, it } from "vitest";
import { dailyTaskId, generateDailyTasks, isDue } from "./task-scheduler";
import type { TaskTemplate } from "./types";

function baseTemplate(overrides: Partial<TaskTemplate>): TaskTemplate {
  return {
    id: "t1",
    title: "Test task",
    category: "household",
    xpValue: 10,
    recurrence: "daily",
    assignedTo: ["u1"],
    daysOfWeek: [],
    active: true,
    ...overrides,
  };
}

describe("dailyTaskId", () => {
  it("joins date, template id and user id", () => {
    expect(dailyTaskId("2026-08-05", "t1", "u1")).toBe("2026-08-05_t1_u1");
  });
});

describe("isDue", () => {
  it("is never due when the template is inactive", () => {
    const template = baseTemplate({ recurrence: "daily", active: false });
    expect(isDue(template, new Date("2026-08-05T12:00:00Z"))).toBe(false);
  });

  it("daily recurrence is always due", () => {
    const template = baseTemplate({ recurrence: "daily" });
    expect(isDue(template, new Date("2026-08-05T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-12-25T12:00:00Z"))).toBe(true);
  });

  it("once recurrence is due only on its exact date", () => {
    const template = baseTemplate({ recurrence: "once", date: "2026-08-05" });
    expect(isDue(template, new Date("2026-08-05T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-08-06T12:00:00Z"))).toBe(false);
  });

  it("weekly/custom recurrence is due only on the listed days of week", () => {
    // 2026-08-05 is a Wednesday (day 3)
    const template = baseTemplate({ recurrence: "weekly", daysOfWeek: [1, 3, 5] });
    expect(isDue(template, new Date("2026-08-05T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-08-06T12:00:00Z"))).toBe(false);

    const custom = baseTemplate({ recurrence: "custom", daysOfWeek: [0, 6] });
    expect(isDue(custom, new Date("2026-08-05T12:00:00Z"))).toBe(false);
  });

  it("monthly recurrence is due on the given day of month", () => {
    const template = baseTemplate({ recurrence: "monthly", dayOfMonth: 15 });
    expect(isDue(template, new Date("2026-08-15T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-08-14T12:00:00Z"))).toBe(false);
  });

  it("monthly recurrence is never due when dayOfMonth is missing", () => {
    const template = baseTemplate({ recurrence: "monthly" });
    expect(isDue(template, new Date("2026-08-15T12:00:00Z"))).toBe(false);
  });

  it("monthly recurrence clamps to the last day of shorter months", () => {
    // February 2026 has 28 days; dayOfMonth 31 should clamp there.
    const template = baseTemplate({ recurrence: "monthly", dayOfMonth: 31 });
    expect(isDue(template, new Date("2026-02-28T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-02-27T12:00:00Z"))).toBe(false);
    // In a 31-day month it still fires on the 31st, not before.
    expect(isDue(template, new Date("2026-01-31T12:00:00Z"))).toBe(true);
    expect(isDue(template, new Date("2026-01-30T12:00:00Z"))).toBe(false);
  });
});

describe("generateDailyTasks", () => {
  it("generates one task per assignee for each due template", () => {
    const templates: TaskTemplate[] = [
      baseTemplate({ id: "t1", recurrence: "daily", assignedTo: ["u1", "u2"] }),
      baseTemplate({ id: "t2", recurrence: "once", date: "2026-08-06", assignedTo: ["u1"] }),
    ];
    const tasks = generateDailyTasks(templates, new Date("2026-08-05T12:00:00Z"));
    expect(tasks).toHaveLength(2);
    expect(tasks).toEqual(
      expect.arrayContaining([
        { templateId: "t1", assignedTo: "u1", date: "2026-08-05", status: "pending" },
        { templateId: "t1", assignedTo: "u2", date: "2026-08-05", status: "pending" },
      ])
    );
  });

  it("skips templates that aren't due and inactive templates", () => {
    const templates: TaskTemplate[] = [
      baseTemplate({ id: "t1", recurrence: "once", date: "2026-01-01" }),
      baseTemplate({ id: "t2", recurrence: "daily", active: false }),
    ];
    expect(generateDailyTasks(templates, new Date("2026-08-05T12:00:00Z"))).toEqual([]);
  });

  it("returns an empty array for no templates", () => {
    expect(generateDailyTasks([], new Date("2026-08-05T12:00:00Z"))).toEqual([]);
  });
});
