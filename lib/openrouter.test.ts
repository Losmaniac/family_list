import { describe, expect, it } from "vitest";
import { parseOpenRouterModels } from "./openrouter";

describe("parseOpenRouterModels", () => {
  it("extracts id/name and flags zero-priced models as free", () => {
    const raw = {
      data: [
        { id: "openai/gpt-4o", name: "GPT-4o", pricing: { prompt: "0.000005", completion: "0.000015" } },
        { id: "inclusionai/ling-3.0-tiny:free", name: "Ling 3.0 Tiny (free)", pricing: { prompt: "0", completion: "0" } },
      ],
    };
    expect(parseOpenRouterModels(raw)).toEqual([
      { id: "openai/gpt-4o", name: "GPT-4o", free: false },
      { id: "inclusionai/ling-3.0-tiny:free", name: "Ling 3.0 Tiny (free)", free: true },
    ]);
  });

  it("drops entries missing an id or name", () => {
    const raw = { data: [{ id: "x" }, { name: "y" }, { id: "z", name: "Z" }] };
    expect(parseOpenRouterModels(raw)).toEqual([{ id: "z", name: "Z", free: false }]);
  });

  it("returns an empty list for a malformed response", () => {
    expect(parseOpenRouterModels(null)).toEqual([]);
    expect(parseOpenRouterModels({})).toEqual([]);
  });
});
