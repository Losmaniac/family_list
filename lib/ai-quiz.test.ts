import { describe, expect, it } from "vitest";
import { AI_QUIZ_TOPICS, buildAiQuizPrompt, parseAiQuizResponse, shuffleThree } from "./ai-quiz";

describe("AI_QUIZ_TOPICS", () => {
  it("has at least a handful of topics with unique ids", () => {
    expect(AI_QUIZ_TOPICS.length).toBeGreaterThanOrEqual(5);
    const ids = AI_QUIZ_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildAiQuizPrompt", () => {
  it("includes the topic label and instructs strict JSON output", () => {
    const prompt = buildAiQuizPrompt("Matematika");
    expect(prompt).toContain("Matematika");
    expect(prompt).toContain("correctIndex");
  });
});

describe("parseAiQuizResponse", () => {
  it("parses a well-formed JSON response", () => {
    const raw = '{"question": "Kolik je 2+2?", "options": ["3", "4", "5"], "correctIndex": 1}';
    expect(parseAiQuizResponse(raw)).toEqual({
      question: "Kolik je 2+2?",
      options: ["3", "4", "5"],
      answer: "4",
    });
  });

  it("strips a markdown code fence Gemini sometimes adds despite instructions", () => {
    const raw = '```json\n{"question": "Q?", "options": ["a", "b", "c"], "correctIndex": 0}\n```';
    expect(parseAiQuizResponse(raw)?.answer).toBe("a");
  });

  it("returns null for malformed JSON", () => {
    expect(parseAiQuizResponse("not json at all")).toBeNull();
  });

  it("returns null when a required field is missing or the wrong shape", () => {
    expect(parseAiQuizResponse('{"question": "Q?"}')).toBeNull();
    expect(parseAiQuizResponse('{"question": "Q?", "options": ["a", "b"], "correctIndex": 0}')).toBeNull();
    expect(parseAiQuizResponse('{"question": "Q?", "options": ["a", "b", "c"], "correctIndex": 5}')).toBeNull();
    expect(parseAiQuizResponse('{"question": "Q?", "options": ["a", "b", "c"], "correctIndex": "0"}')).toBeNull();
  });
});

describe("shuffleThree", () => {
  it("contains exactly the same three items, just reordered", () => {
    const shuffled = shuffleThree(["a", "b", "c"], () => 0.99);
    expect(new Set(shuffled)).toEqual(new Set(["a", "b", "c"]));
    expect(shuffled).toHaveLength(3);
  });

  it("is deterministic for a given random source", () => {
    const first = shuffleThree(["a", "b", "c"], () => 0.5);
    const second = shuffleThree(["a", "b", "c"], () => 0.5);
    expect(first).toEqual(second);
  });
});
