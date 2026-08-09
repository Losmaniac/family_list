import { describe, expect, it } from "vitest";
import { filterChannels, joinChannelsWithStreams, parseCategories, parseCountries } from "./iptv-org";

describe("joinChannelsWithStreams", () => {
  const channels = [
    { id: "c1", name: "Channel One", country: "CZ", categories: ["news"], logo: "l1.png" },
    { id: "c2", name: "Channel Two", country: "SK", categories: ["kids"], logo: "l2.png" },
    { id: "c3", name: "Closed Channel", country: "CZ", categories: [], closed: true },
    { id: "c4", name: "Replaced Channel", country: "CZ", categories: [], replaced_by: "c1" },
    { id: "c5", name: "No Stream Channel", country: "CZ", categories: [] },
  ];
  const streams = [
    { channel: "c1", url: "https://stream.example.com/c1.m3u8" },
    { channel: "c2", url: "https://stream.example.com/c2.m3u8" },
    { channel: "c3", url: "https://stream.example.com/c3.m3u8" },
    { channel: "c4", url: "https://stream.example.com/c4.m3u8" },
  ];

  it("joins channels with their stream URL", () => {
    const result = joinChannelsWithStreams(channels, streams);
    expect(result.find((c) => c.id === "c1")).toEqual({
      id: "c1",
      name: "Channel One",
      country: "CZ",
      categories: ["news"],
      logo: "l1.png",
      streamUrl: "https://stream.example.com/c1.m3u8",
    });
  });

  it("drops closed channels", () => {
    expect(joinChannelsWithStreams(channels, streams).find((c) => c.id === "c3")).toBeUndefined();
  });

  it("drops replaced channels", () => {
    expect(joinChannelsWithStreams(channels, streams).find((c) => c.id === "c4")).toBeUndefined();
  });

  it("drops channels with no matching stream", () => {
    expect(joinChannelsWithStreams(channels, streams).find((c) => c.id === "c5")).toBeUndefined();
  });

  it("keeps the first stream when a channel has duplicate entries", () => {
    const dupStreams = [
      { channel: "c1", url: "https://first.example.com" },
      { channel: "c1", url: "https://second.example.com" },
    ];
    const result = joinChannelsWithStreams(channels, dupStreams);
    expect(result.find((c) => c.id === "c1")?.streamUrl).toBe("https://first.example.com");
  });
});

describe("filterChannels", () => {
  const channels = [
    { id: "c1", name: "News One", country: "CZ", categories: ["news"], logo: "", streamUrl: "u1" },
    { id: "c2", name: "Kids Two", country: "SK", categories: ["kids"], logo: "", streamUrl: "u2" },
    { id: "c3", name: "News Three", country: "SK", categories: ["news", "general"], logo: "", streamUrl: "u3" },
  ];

  it("filters by country", () => {
    expect(filterChannels(channels, { country: "SK" }).map((c) => c.id)).toEqual(["c2", "c3"]);
  });

  it("filters by category", () => {
    expect(filterChannels(channels, { category: "news" }).map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("filters by case-insensitive name substring", () => {
    expect(filterChannels(channels, { name: "kids" }).map((c) => c.id)).toEqual(["c2"]);
  });

  it("combines filters", () => {
    expect(filterChannels(channels, { country: "SK", category: "news" }).map((c) => c.id)).toEqual(["c3"]);
  });

  it("returns everything when no filters are given", () => {
    expect(filterChannels(channels, {})).toHaveLength(3);
  });
});

describe("parseCountries / parseCategories", () => {
  it("drops entries missing a code/name and sorts alphabetically", () => {
    const countries = parseCountries([{ code: "SK", name: "Slovakia" }, { code: "CZ", name: "Czechia" }, { name: "No code" }]);
    expect(countries).toEqual([
      { code: "CZ", name: "Czechia" },
      { code: "SK", name: "Slovakia" },
    ]);
  });

  it("drops category entries missing an id/name", () => {
    const categories = parseCategories([{ id: "news", name: "News" }, { name: "No id" }]);
    expect(categories).toEqual([{ id: "news", name: "News" }]);
  });
});
