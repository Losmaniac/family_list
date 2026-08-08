import { describe, expect, it } from "vitest";
import { findMemberConflict } from "./members";

const members = [
  { id: "u1", name: "Anna", avatarUrl: "letter:0:A" },
  { id: "u2", name: "Tomáš", avatarUrl: "letter:1:T" },
];

describe("findMemberConflict", () => {
  it("flags a case/whitespace-insensitive name collision", () => {
    expect(findMemberConflict(members, { name: "  anna " })?.type).toBe("name");
  });

  it("flags an exact avatar collision", () => {
    expect(findMemberConflict(members, { name: "Nová", avatarUrl: "letter:0:A" })?.type).toBe("avatar");
    expect(findMemberConflict(members, { name: "Nová", avatarUrl: "letter:1:T" })?.type).toBe("avatar");
  });

  it("returns null when nothing conflicts", () => {
    expect(findMemberConflict(members, { name: "Petr", avatarUrl: "letter:2:P" })).toBeNull();
  });

  it("never conflicts on a missing avatarUrl", () => {
    expect(findMemberConflict(members, { name: "Petr" })).toBeNull();
  });

  it("excludes the member being edited from their own conflict check", () => {
    expect(findMemberConflict(members, { name: "Anna", avatarUrl: "letter:0:A" }, "u1")).toBeNull();
  });

  it("still catches a collision with someone else while editing", () => {
    expect(findMemberConflict(members, { name: "Tomáš" }, "u1")?.type).toBe("name");
  });
});
