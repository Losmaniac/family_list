import { describe, expect, it } from "vitest";
import {
  buildDicebearUrl,
  encodeDicebearAvatar,
  encodeFaceAvatar,
  encodeLetterAvatar,
  parseDicebearAvatar,
  parseFaceAvatar,
  parseLetterAvatar,
  randomDicebearSeed,
  DEFAULT_FACE_AVATAR,
} from "./avatars";

describe("dicebear avatar encode/parse", () => {
  it("round-trips a config through encode and parse", () => {
    const config = { style: "adventurer", seed: "abc123" };
    expect(parseDicebearAvatar(encodeDicebearAvatar(config))).toEqual(config);
  });

  it("returns null for a non-dicebear value", () => {
    expect(parseDicebearAvatar("face:{}")).toBeNull();
    expect(parseDicebearAvatar(undefined)).toBeNull();
    expect(parseDicebearAvatar("🦊")).toBeNull();
  });

  it("returns null for malformed JSON or a missing field", () => {
    expect(parseDicebearAvatar("dicebear:not json")).toBeNull();
    expect(parseDicebearAvatar(`dicebear:${JSON.stringify({ style: "adventurer" })}`)).toBeNull();
  });

  it("doesn't get confused with the face/letters encodings", () => {
    expect(parseDicebearAvatar(encodeFaceAvatar(DEFAULT_FACE_AVATAR))).toBeNull();
    expect(parseDicebearAvatar(encodeLetterAvatar({ text: "AB", color: 0 }))).toBeNull();
    expect(parseFaceAvatar(encodeDicebearAvatar({ style: "adventurer", seed: "x" }))).toBeNull();
    expect(parseLetterAvatar(encodeDicebearAvatar({ style: "adventurer", seed: "x" }))).toBeNull();
  });
});

describe("buildDicebearUrl", () => {
  it("builds a URL for the given style and seed", () => {
    const url = buildDicebearUrl({ style: "bottts", seed: "hello" });
    expect(url).toBe("https://api.dicebear.com/9.x/bottts/svg?seed=hello");
  });

  it("URL-encodes the style and seed", () => {
    const url = buildDicebearUrl({ style: "fun-emoji", seed: "a b/c" });
    expect(url).toContain("fun-emoji");
    expect(url).toContain("seed=a+b%2Fc");
  });
});

describe("randomDicebearSeed", () => {
  it("returns a non-empty string", () => {
    expect(randomDicebearSeed().length).toBeGreaterThan(0);
  });

  it("returns different values across calls (extremely likely)", () => {
    expect(randomDicebearSeed()).not.toBe(randomDicebearSeed());
  });
});
