import { describe, it, expect } from "vitest";
import { detectCountryFromLocale } from "../detect-country";

describe("detectCountryFromLocale", () => {
  it("extracts HN from es-HN", () => {
    expect(detectCountryFromLocale("es-HN")).toBe("HN");
  });

  it("extracts US from en-US", () => {
    expect(detectCountryFromLocale("en-US")).toBe("US");
  });

  it("extracts MX from es-MX", () => {
    expect(detectCountryFromLocale("es-MX")).toBe("MX");
  });

  it("falls back to HN for bare locale with no region", () => {
    expect(detectCountryFromLocale("es")).toBe("HN");
  });

  it("falls back to HN for a gibberish locale", () => {
    expect(detectCountryFromLocale("zz-ZZ")).toBe("HN");
  });

  it("falls back to HN for an empty string", () => {
    expect(detectCountryFromLocale("")).toBe("HN");
  });
});
