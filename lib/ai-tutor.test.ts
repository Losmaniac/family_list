import { describe, expect, it } from "vitest";
import {
  AI_TUTOR_DEPTHS,
  AI_TUTOR_MODES,
  aiTutorDepthLabel,
  aiTutorModeLabel,
  buildAiTutorPrompt,
  normalizeAiTutorSubject,
  parseAiTutorResponse,
} from "./ai-tutor";

describe("normalizeAiTutorSubject", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeAiTutorSubject("  fotosyntéza   rostlin  ")).toBe("fotosyntéza rostlin");
  });

  it("rejects empty input", () => {
    expect(normalizeAiTutorSubject("   ")).toBeNull();
  });

  it("rejects input over the max length", () => {
    expect(normalizeAiTutorSubject("a".repeat(200))).toBeNull();
  });
});

describe("aiTutorDepthLabel / aiTutorModeLabel", () => {
  it("resolves a known value to its label", () => {
    expect(aiTutorDepthLabel("advanced")).toBe("Pokročilá");
    expect(aiTutorModeLabel("quiz")).toBe("Procvičit otázkami");
  });

  it("falls back to the first option for an unknown value", () => {
    expect(aiTutorDepthLabel("nonsense")).toBe(AI_TUTOR_DEPTHS[0].label);
    expect(aiTutorModeLabel("nonsense")).toBe(AI_TUTOR_MODES[0].label);
  });
});

describe("buildAiTutorPrompt", () => {
  it("includes the subject, depth, and mode", () => {
    const prompt = buildAiTutorPrompt("fotosyntéza", "basics", "explain", [], "Co je fotosyntéza?");
    expect(prompt).toContain("fotosyntéza");
    expect(prompt).toContain("Základy");
    expect(prompt).toContain("Vysvětlit");
    expect(prompt).toContain("Co je fotosyntéza?");
  });

  it("adds a one-question-at-a-time instruction in quiz mode", () => {
    const prompt = buildAiTutorPrompt("historie", "intermediate", "quiz", [], "Zeptej se mě něco.");
    expect(prompt).toMatch(/jen JEDNU otázku/);
  });

  it("adds a no-spoiler instruction in homework mode", () => {
    const prompt = buildAiTutorPrompt("matematika", "intermediate", "homework", [], "Jak se počítá obvod kruhu?");
    expect(prompt).toMatch(/Nikdy rovnou nenapiš celé hotové řešení/);
  });

  it("includes prior conversation turns as context when present", () => {
    const prompt = buildAiTutorPrompt(
      "dějepis",
      "basics",
      "explain",
      [
        { role: "user", text: "Kdy začala první světová válka?" },
        { role: "assistant", text: "V roce 1914." },
      ],
      "A kdy skončila?"
    );
    expect(prompt).toContain("Kdy začala první světová válka?");
    expect(prompt).toContain("V roce 1914.");
    expect(prompt).toContain("A kdy skončila?");
  });

  it("omits the conversation-history section when there's no history", () => {
    const prompt = buildAiTutorPrompt("chemie", "basics", "explain", [], "Co je oxidace?");
    expect(prompt).not.toContain("Dosavadní konverzace");
  });
});

describe("parseAiTutorResponse", () => {
  it("returns the trimmed text when non-empty", () => {
    expect(parseAiTutorResponse("  Ahoj, tady je odpověď.  ")).toBe("Ahoj, tady je odpověď.");
  });

  it("returns null for an empty/whitespace-only response", () => {
    expect(parseAiTutorResponse("   ")).toBeNull();
  });
});
