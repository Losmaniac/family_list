import { describe, expect, it } from "vitest";
import { formatCompletedAt, groupItemsByCategory, LIST_PRESETS, WISHLIST_CATEGORIES } from "./lists";

describe("groupItemsByCategory", () => {
  it("groups items by category in the given order, dropping empty groups", () => {
    const groups = groupItemsByCategory(
      [
        { id: "a", category: "Vánoce" },
        { id: "b", category: "Narozeniny" },
        { id: "c", category: "Narozeniny" },
      ],
      ["Narozeniny", "Svátek", "Vánoce"]
    );
    expect(groups.map((g) => g.category)).toEqual(["Narozeniny", "Vánoce"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("puts items with no matching category into a trailing Ostatní group", () => {
    const groups = groupItemsByCategory(
      [{ id: "a", category: "Něco jiného" }, { id: "b" }],
      ["Narozeniny"]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("Ostatní");
    expect(groups[0].items).toHaveLength(2);
  });

  it("returns a single unlabeled group when the list has no categories at all", () => {
    const items: { id: string; category?: string }[] = [{ id: "a" }, { id: "b" }];
    const groups = groupItemsByCategory(items, undefined);
    expect(groups).toEqual([{ category: null, items }]);
  });

  it("returns nothing for an empty item list", () => {
    const empty: { category?: string }[] = [];
    expect(groupItemsByCategory(empty, undefined)).toEqual([]);
    expect(groupItemsByCategory(empty, ["Narozeniny"])).toEqual([]);
  });
});

describe("formatCompletedAt", () => {
  it("formats a timestamp with date and time", () => {
    const formatted = formatCompletedAt(new Date("2026-03-05T14:30:00").getTime());
    expect(formatted).toContain("2026");
    expect(formatted).toMatch(/14[.:]30|2:30/);
  });

  it("returns undefined for an absent timestamp", () => {
    expect(formatCompletedAt(undefined)).toBeUndefined();
  });
});

describe("LIST_PRESETS", () => {
  it("includes the wishlist preset with its occasion categories", () => {
    const wishlist = LIST_PRESETS.find((p) => p.kind === "wishlist");
    expect(wishlist?.categories).toBe(WISHLIST_CATEGORIES);
  });

  it("every preset has a non-empty title", () => {
    for (const preset of LIST_PRESETS) {
      expect(preset.title.length).toBeGreaterThan(0);
    }
  });
});
