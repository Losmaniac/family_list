import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("returns the string for the requested locale", () => {
    expect(translate("cs", "nav.today")).toBe("Dnes");
    expect(translate("en", "nav.today")).toBe("Today");
  });

  it("falls back to Czech for a locale with no dictionary at all", () => {
    // @ts-expect-error deliberately passing an unsupported locale to exercise the fallback
    expect(translate("de", "nav.today")).toBe("Dnes");
  });
});
