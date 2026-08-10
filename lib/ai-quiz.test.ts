import { describe, expect, it } from "vitest";
import {
  AI_QUIZ_TOPICS,
  buildAiQuizPrompt,
  CUSTOM_TOPIC_ID,
  difficultyLabelForStreak,
  MAX_CUSTOM_TOPIC_LENGTH,
  MAX_RECENT_QUESTIONS,
  normalizeCustomTopic,
  parseAiQuizResponse,
  shuffleThree,
  streakKeyForTopic,
} from "./ai-quiz";

describe("AI_QUIZ_TOPICS", () => {
  it("has at least a handful of topics with unique ids", () => {
    expect(AI_QUIZ_TOPICS.length).toBeGreaterThanOrEqual(5);
    const ids = AI_QUIZ_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never uses the reserved custom-topic id", () => {
    expect(AI_QUIZ_TOPICS.some((t) => t.id === CUSTOM_TOPIC_ID)).toBe(false);
  });
});

describe("buildAiQuizPrompt", () => {
  it("includes the topic label and instructs strict JSON output", () => {
    const prompt = buildAiQuizPrompt("Matematika");
    expect(prompt).toContain("Matematika");
    expect(prompt).toContain("correctIndex");
  });

  it("includes a custom difficulty label when given one", () => {
    const prompt = buildAiQuizPrompt("Matematika", "expertní úroveň");
    expect(prompt).toContain("expertní úroveň");
  });

  it("includes a do-not-repeat list when given recent questions, omits it otherwise", () => {
    const withHistory = buildAiQuizPrompt("Fotbal", undefined, ["Kolik hráčů má fotbalový tým na hřišti?"]);
    expect(withHistory).toContain("Kolik hráčů má fotbalový tým na hřišti?");
    expect(withHistory).toContain("nesmíš zopakovat");

    const withoutHistory = buildAiQuizPrompt("Fotbal");
    expect(withoutHistory).not.toContain("nesmíš zopakovat");
  });

  it("has a sane MAX_RECENT_QUESTIONS", () => {
    expect(MAX_RECENT_QUESTIONS).toBeGreaterThan(0);
  });

  it("instructs the model to use grammatically correct Czech", () => {
    const prompt = buildAiQuizPrompt("Matematika");
    expect(prompt).toContain("gramaticky absolutně správné češtině");
    expect(prompt).toContain("skloňování a časování");
  });
});

describe("difficultyLabelForStreak", () => {
  it("ramps up as the streak grows and never regresses at higher streaks", () => {
    const base = difficultyLabelForStreak(0);
    expect(difficultyLabelForStreak(1)).toBe(base);
    expect(difficultyLabelForStreak(2)).not.toBe(base);
    expect(difficultyLabelForStreak(5)).not.toBe(difficultyLabelForStreak(2));
    expect(difficultyLabelForStreak(8)).not.toBe(difficultyLabelForStreak(5));
    expect(difficultyLabelForStreak(20)).toBe(difficultyLabelForStreak(8));
  });
});

describe("normalizeCustomTopic", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCustomTopic("  dinosauři   jury  ")).toBe("dinosauři jury");
  });

  it("rejects empty or whitespace-only input", () => {
    expect(normalizeCustomTopic("")).toBeNull();
    expect(normalizeCustomTopic("   ")).toBeNull();
  });

  it("rejects input longer than the max length", () => {
    expect(normalizeCustomTopic("a".repeat(MAX_CUSTOM_TOPIC_LENGTH))).not.toBeNull();
    expect(normalizeCustomTopic("a".repeat(MAX_CUSTOM_TOPIC_LENGTH + 1))).toBeNull();
  });
});

describe("streakKeyForTopic", () => {
  it("uses the topic id directly for built-in topics", () => {
    expect(streakKeyForTopic("math")).toBe("math");
  });

  it("buckets custom topics by lowercased text so the same topic keeps ramping up", () => {
    expect(streakKeyForTopic(CUSTOM_TOPIC_ID, "Dinosauři")).toBe("custom:dinosauři");
    expect(streakKeyForTopic(CUSTOM_TOPIC_ID, "dinosauři")).toBe(streakKeyForTopic(CUSTOM_TOPIC_ID, "Dinosauři"));
    expect(streakKeyForTopic(CUSTOM_TOPIC_ID, "vesmír")).not.toBe(streakKeyForTopic(CUSTOM_TOPIC_ID, "dinosauři"));
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
