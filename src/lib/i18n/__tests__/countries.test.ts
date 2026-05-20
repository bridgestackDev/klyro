import { describe, it, expect } from "vitest";
import { COUNTRIES, getCountry, DEFAULT_COUNTRY } from "../countries";

describe("COUNTRIES catalog", () => {
  it("contains all 8 required countries", () => {
    const codes = Object.keys(COUNTRIES);
    expect(codes).toContain("HN");
    expect(codes).toContain("SV");
    expect(codes).toContain("GT");
    expect(codes).toContain("NI");
    expect(codes).toContain("CR");
    expect(codes).toContain("MX");
    expect(codes).toContain("CO");
    expect(codes).toContain("US");
    expect(codes).toHaveLength(8);
  });

  it("HN entry has correct shape", () => {
    expect(COUNTRIES.HN).toEqual({
      name: "Honduras",
      currency: "HNL",
      dialCode: "+504",
      timezone: "America/Tegucigalpa",
      locale: "es-HN",
    });
  });

  it("US entry has en-US locale and USD currency", () => {
    expect(COUNTRIES.US.locale).toBe("en-US");
    expect(COUNTRIES.US.currency).toBe("USD");
  });
});

describe("getCountry", () => {
  it("returns the correct country for a known code", () => {
    const country = getCountry("HN");
    expect(country).toBeDefined();
    expect(country?.name).toBe("Honduras");
  });

  it("is case-insensitive", () => {
    expect(getCountry("hn")).toBeDefined();
    expect(getCountry("HN")).toBeDefined();
  });

  it("returns undefined for an unknown code", () => {
    expect(getCountry("ZZ")).toBeUndefined();
    expect(getCountry("")).toBeUndefined();
  });
});

describe("DEFAULT_COUNTRY", () => {
  it("is HN", () => {
    expect(DEFAULT_COUNTRY).toBe("HN");
  });
});
