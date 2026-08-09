import { describe, expect, it } from "vitest";
import { JOURNAL_KIND_LABELS, JOURNAL_PRESETS } from "./journals";

describe("JOURNAL_PRESETS", () => {
  it("includes both built-in diary presets with matching labels", () => {
    expect(JOURNAL_PRESETS.map((p) => p.kind)).toEqual(["food", "training"]);
    for (const preset of JOURNAL_PRESETS) {
      expect(preset.title).toBe(JOURNAL_KIND_LABELS[preset.kind]);
    }
  });
});
