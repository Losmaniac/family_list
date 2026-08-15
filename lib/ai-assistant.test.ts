import { describe, expect, it } from "vitest";
import {
  buildAiAssistantPrompt,
  parseAiAssistantResponse,
  summarizeAiAssistantConversations,
} from "./ai-assistant";

describe("buildAiAssistantPrompt", () => {
  it("includes the question", () => {
    expect(buildAiAssistantPrompt([], "Jak se řekne anglicky pes?")).toContain("Jak se řekne anglicky pes?");
  });

  it("includes prior conversation turns as context when present", () => {
    const prompt = buildAiAssistantPrompt(
      [
        { role: "user", text: "Ahoj, jak se máš?" },
        { role: "assistant", text: "Mám se dobře, díky!" },
      ],
      "Co umíš?"
    );
    expect(prompt).toContain("Ahoj, jak se máš?");
    expect(prompt).toContain("Mám se dobře, díky!");
    expect(prompt).toContain("Co umíš?");
  });

  it("omits the conversation-history section when there's no history", () => {
    const prompt = buildAiAssistantPrompt([], "Ahoj");
    expect(prompt).not.toContain("Dosavadní konverzace");
  });
});

describe("parseAiAssistantResponse", () => {
  it("returns the trimmed text when non-empty", () => {
    expect(parseAiAssistantResponse("  Ahoj! Jak ti mohu pomoci?  ")).toBe("Ahoj! Jak ti mohu pomoci?");
  });

  it("returns null for an empty/whitespace-only response", () => {
    expect(parseAiAssistantResponse("   ")).toBeNull();
  });
});

describe("summarizeAiAssistantConversations", () => {
  it("groups messages by conversationId and titles by the earliest user message", () => {
    const conversations = summarizeAiAssistantConversations([
      { conversationId: "c1", role: "user", text: "Pomoz mi napsat email", timestamp: 100 },
      { conversationId: "c1", role: "assistant", text: "Jasně, o čem má být?", timestamp: 101 },
      { conversationId: "c2", role: "user", text: "Jaký je rozdíl mezi TCP a UDP?", timestamp: 200 },
    ]);
    expect(conversations).toHaveLength(2);
    const c1 = conversations.find((c) => c.conversationId === "c1");
    expect(c1?.title).toBe("Pomoz mi napsat email");
    expect(c1?.lastMessageAt).toBe(101);
  });

  it("titles by the earliest user message even out of input order", () => {
    const conversations = summarizeAiAssistantConversations([
      { conversationId: "c1", role: "assistant", text: "Reakce na první zprávu", timestamp: 50 },
      { conversationId: "c1", role: "user", text: "Druhá otázka", timestamp: 300 },
      { conversationId: "c1", role: "user", text: "První otázka", timestamp: 10 },
    ]);
    expect(conversations[0].title).toBe("První otázka");
    expect(conversations[0].lastMessageAt).toBe(300);
  });

  it("sorts conversations most-recently-active first", () => {
    const conversations = summarizeAiAssistantConversations([
      { conversationId: "starší", role: "user", text: "a", timestamp: 100 },
      { conversationId: "novější", role: "user", text: "b", timestamp: 500 },
    ]);
    expect(conversations.map((c) => c.conversationId)).toEqual(["novější", "starší"]);
  });

  it("truncates a long title", () => {
    const conversations = summarizeAiAssistantConversations([
      { conversationId: "c1", role: "user", text: "a".repeat(100), timestamp: 1 },
    ]);
    expect(conversations[0].title.length).toBeLessThan(100);
    expect(conversations[0].title.endsWith("…")).toBe(true);
  });

  it("returns an empty list for no messages", () => {
    expect(summarizeAiAssistantConversations([])).toEqual([]);
  });
});
