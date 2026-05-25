import { describe, it, expect, vi } from "vitest";
import { generateBookingCode, generateUniqueBookingCode } from "@/lib/booking/booking-code";

const CODE_REGEX = /^KLY-[A-Z0-9]{4}$/;
// Characters excluded to avoid visual ambiguity
const AMBIGUOUS = new Set(["I", "O", "0", "1"]);

describe("generateBookingCode", () => {
  it("returns a string matching KLY-XXXX format", () => {
    expect(generateBookingCode()).toMatch(CODE_REGEX);
  });

  it("uses only unambiguous characters (no I, O, 0, 1)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateBookingCode();
      for (const ch of code.slice(4)) {
        expect(AMBIGUOUS.has(ch)).toBe(false);
      }
    }
  });

  it("generates different codes across successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateBookingCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("generateUniqueBookingCode", () => {
  it("returns a code immediately when the first candidate is unique", async () => {
    const checkExists = vi.fn().mockResolvedValue(false);
    const code = await generateUniqueBookingCode(checkExists);
    expect(code).toMatch(CODE_REGEX);
    expect(checkExists).toHaveBeenCalledTimes(1);
  });

  it("retries until a unique code is found", async () => {
    let calls = 0;
    const checkExists = vi.fn().mockImplementation(async () => {
      calls++;
      return calls < 3; // first 2 calls indicate collision
    });

    const code = await generateUniqueBookingCode(checkExists);
    expect(code).toMatch(CODE_REGEX);
    expect(checkExists).toHaveBeenCalledTimes(3);
  });

  it("throws after maxRetries collisions", async () => {
    const checkExists = vi.fn().mockResolvedValue(true); // always exists
    await expect(generateUniqueBookingCode(checkExists, 3)).rejects.toThrow();
    expect(checkExists).toHaveBeenCalledTimes(3);
  });
});
