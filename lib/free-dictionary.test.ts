import { describe, expect, it } from "vitest";
import { buildDictionaryUrl, extractDefinition } from "./free-dictionary";

describe("buildDictionaryUrl", () => {
  it("builds a dictionaryapi.dev URL for the word", () => {
    expect(buildDictionaryUrl("happy")).toBe("https://api.dictionaryapi.dev/api/v2/entries/en/happy");
  });

  it("URL-encodes the word", () => {
    expect(buildDictionaryUrl("café au lait")).toContain("caf%C3%A9%20au%20lait");
  });
});

describe("extractDefinition", () => {
  it("returns the first usable definition", () => {
    const entries = [{ meanings: [{ definitions: [{ definition: "A feeling of joy or contentment." }] }] }];
    expect(extractDefinition(entries, "happy")).toBe("A feeling of joy or contentment.");
  });

  it("skips a definition that gives the word away", () => {
    const entries = [
      {
        meanings: [
          {
            definitions: [
              { definition: "Happy is a feeling of joy." },
              { definition: "A state of contentment or satisfaction." },
            ],
          },
        ],
      },
    ];
    expect(extractDefinition(entries, "happy")).toBe("A state of contentment or satisfaction.");
  });

  it("skips definitions that are too short to be useful", () => {
    const entries = [{ meanings: [{ definitions: [{ definition: "See." }, { definition: "A domesticated carnivorous mammal." }] }] }];
    expect(extractDefinition(entries, "dog")).toBe("A domesticated carnivorous mammal.");
  });

  it("returns undefined when nothing usable is found", () => {
    expect(extractDefinition([{ meanings: [{ definitions: [{ definition: "See x." }] }] }], "x")).toBeUndefined();
    expect(extractDefinition([], "x")).toBeUndefined();
  });
});
