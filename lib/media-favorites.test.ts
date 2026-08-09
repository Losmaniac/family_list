import { describe, expect, it } from "vitest";
import { isFavorite, toggleFavorite } from "./media-favorites";

describe("toggleFavorite", () => {
  it("adds an item that isn't in the list yet", () => {
    expect(toggleFavorite(undefined, { id: "a" })).toEqual([{ id: "a" }]);
    expect(toggleFavorite([{ id: "a" }], { id: "b" })).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("removes an item that's already in the list, matching by id", () => {
    expect(toggleFavorite([{ id: "a" }, { id: "b" }], { id: "a" })).toEqual([{ id: "b" }]);
  });
});

describe("isFavorite", () => {
  it("matches by id", () => {
    expect(isFavorite([{ id: "a" }], "a")).toBe(true);
    expect(isFavorite([{ id: "a" }], "b")).toBe(false);
    expect(isFavorite(undefined, "a")).toBe(false);
  });
});
