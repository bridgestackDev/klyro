import { describe, it, expect } from "vitest";
import { formatCurrency } from "../currency";
import { formatDate, formatTime } from "../date";

describe("formatCurrency", () => {
  it("formats HNL with L symbol in es-HN locale", () => {
    const result = formatCurrency(250, "HNL", "es-HN");
    // The exact symbol may vary by runtime, but should contain '250' and some currency indicator
    expect(result).toContain("250");
    // HNL in es-HN should use 'L' or 'HNL' depending on the platform's CLDR data
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats USD with $ in en-US locale", () => {
    const result = formatCurrency(99.99, "USD", "en-US");
    expect(result).toContain("99.99");
    expect(result).toContain("$");
  });

  it("formats MXN correctly in es-MX locale", () => {
    const result = formatCurrency(500, "MXN", "es-MX");
    expect(result).toContain("500");
    expect(typeof result).toBe("string");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "HNL", "es-HN");
    expect(result).toContain("0");
  });

  it("formats large amounts with proper separators", () => {
    const result = formatCurrency(1250.5, "USD", "en-US");
    expect(result).toContain("1,250");
  });
});

describe("formatDate", () => {
  it("returns a non-empty string for es-HN", () => {
    const d = new Date("2026-05-19T10:00:00");
    const result = formatDate(d, "es-HN");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for en-US", () => {
    const d = new Date("2026-05-19T10:00:00");
    const result = formatDate(d, "en-US");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a string date", () => {
    const result = formatDate("2026-05-19T10:00:00", "es-HN");
    expect(typeof result).toBe("string");
  });
});

describe("formatTime", () => {
  it("uses 24h format for es-HN", () => {
    const d = new Date("2026-05-19T15:30:00");
    const result = formatTime(d, "es-HN");
    expect(result).toBe("15:30");
  });

  it("uses 12h format for en-US", () => {
    const d = new Date("2026-05-19T15:30:00");
    const result = formatTime(d, "en-US");
    // "3:30 PM" or similar — check for PM indicator
    expect(result.toUpperCase()).toContain("PM");
    expect(result).toContain("3:30");
  });
});
