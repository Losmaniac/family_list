import { describe, expect, it } from "vitest";
import { formatContextLength, parseOpenRouterModels } from "./openrouter";

describe("parseOpenRouterModels", () => {
  it("extracts id/name/contextLength and flags zero-priced models as free", () => {
    const raw = {
      data: [
        { id: "openai/gpt-4o", name: "GPT-4o", pricing: { prompt: "0.000005", completion: "0.000015" }, context_length: 128000 },
        {
          id: "inclusionai/ling-3.0-tiny:free",
          name: "Ling 3.0 Tiny (free)",
          pricing: { prompt: "0", completion: "0" },
          context_length: 262144,
        },
      ],
    };
    expect(parseOpenRouterModels(raw)).toEqual([
      { id: "openai/gpt-4o", name: "GPT-4o", free: false, contextLength: 128000 },
      { id: "inclusionai/ling-3.0-tiny:free", name: "Ling 3.0 Tiny (free)", free: true, contextLength: 262144 },
    ]);
  });

  it("drops entries missing an id or name, and treats a missing/invalid context_length as null", () => {
    const raw = { data: [{ id: "x" }, { name: "y" }, { id: "z", name: "Z" }, { id: "w", name: "W", context_length: 0 }] };
    expect(parseOpenRouterModels(raw)).toEqual([
      { id: "z", name: "Z", free: false, contextLength: null },
      { id: "w", name: "W", free: false, contextLength: null },
    ]);
  });

  it("returns an empty list for a malformed response", () => {
    expect(parseOpenRouterModels(null)).toEqual([]);
    expect(parseOpenRouterModels({})).toEqual([]);
  });
});

describe("formatContextLength", () => {
  it("formats thousands and millions with a compact suffix", () => {
    expect(formatContextLength(128000)).toBe("128K");
    expect(formatContextLength(262144)).toBe("262.1K");
    expect(formatContextLength(1000000)).toBe("1M");
    expect(formatContextLength(500)).toBe("500");
  });
});
