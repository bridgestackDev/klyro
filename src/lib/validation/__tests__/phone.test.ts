import { describe, it, expect } from "vitest";
import { validatePhone, normalizePhone, isValidWhatsAppNumber } from "../phone";

describe("validatePhone — Honduras (HN)", () => {
  it("accepts a valid HN number in national format", () => {
    const result = validatePhone("9876-5432", "HN");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe("+50498765432");
  });

  it("accepts a valid HN number in E.164 format", () => {
    const result = validatePhone("+50498765432", "HN");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe("+50498765432");
  });

  it("rejects an empty string as INVALID", () => {
    const result = validatePhone("", "HN");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID");
  });

  it("rejects a too-short number as INVALID", () => {
    const result = validatePhone("123", "HN");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID");
  });

  it("rejects a US number when country is HN as WRONG_COUNTRY", () => {
    // +12025551234 is a valid US number — country mismatch with HN
    const result = validatePhone("+12025551234", "HN");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("WRONG_COUNTRY");
  });
});

describe("validatePhone — Mexico (MX)", () => {
  it("accepts a valid MX mobile number in E.164", () => {
    const result = validatePhone("+525512345678", "MX");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe("+525512345678");
  });

  it("rejects a HN number when country is MX as WRONG_COUNTRY", () => {
    const result = validatePhone("+50498765432", "MX");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("WRONG_COUNTRY");
  });
});

describe("validatePhone — United States (US)", () => {
  it("accepts a valid US number", () => {
    const result = validatePhone("+12025551234", "US");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe("+12025551234");
  });

  it("rejects a number with letters as INVALID", () => {
    const result = validatePhone("abc-def-ghij", "US");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID");
  });
});

describe("normalizePhone", () => {
  it("returns E.164 for a valid number", () => {
    expect(normalizePhone("+50498765432", "HN")).toBe("+50498765432");
  });

  it("returns null for an invalid number", () => {
    expect(normalizePhone("not-a-number", "HN")).toBeNull();
  });
});

describe("isValidWhatsAppNumber", () => {
  it("returns true for a valid number regardless of country match", () => {
    expect(isValidWhatsAppNumber("+50498765432", "HN")).toBe(true);
    // US number is still valid for WhatsApp even if the business is in HN
    expect(isValidWhatsAppNumber("+12025551234", "HN")).toBe(true);
  });

  it("returns false for an invalid number", () => {
    expect(isValidWhatsAppNumber("123", "HN")).toBe(false);
    expect(isValidWhatsAppNumber("", "HN")).toBe(false);
  });
});
