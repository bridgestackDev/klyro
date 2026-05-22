import { describe, it, expect } from "vitest";
import { slotsQuerySchema, createBookingSchema } from "@/lib/schemas/booking";

// Must be a valid RFC 4122 UUID: version [1-8] in group3, variant [89abAB] in group4
const UUID = "00000000-0000-4000-8000-000000000001";
const DATE = "2025-06-09";
const ISO_DATETIME = "2025-06-09T15:00:00.000Z";

describe("slotsQuerySchema", () => {
  it("accepts a valid query", () => {
    expect(slotsQuerySchema.safeParse({ staffId: UUID, serviceId: UUID, branchId: UUID, date: DATE }).success).toBe(true);
  });

  it("rejects an invalid UUID for staffId", () => {
    expect(slotsQuerySchema.safeParse({ staffId: "not-uuid", serviceId: UUID, branchId: UUID, date: DATE }).success).toBe(false);
  });

  it("rejects an invalid UUID for serviceId", () => {
    expect(slotsQuerySchema.safeParse({ staffId: UUID, serviceId: "bad", branchId: UUID, date: DATE }).success).toBe(false);
  });

  it("rejects a date not in YYYY-MM-DD format", () => {
    expect(slotsQuerySchema.safeParse({ staffId: UUID, serviceId: UUID, branchId: UUID, date: "06/09/2025" }).success).toBe(false);
  });

  it("rejects a missing date field", () => {
    expect(slotsQuerySchema.safeParse({ staffId: UUID, serviceId: UUID, branchId: UUID }).success).toBe(false);
  });
});

describe("createBookingSchema", () => {
  const valid = {
    staffId: UUID,
    serviceId: UUID,
    branchId: UUID,
    slotStart: ISO_DATETIME,
    clientName: "Jane Doe",
    clientPhone: "+50422345678",
  };

  it("accepts a valid booking payload", () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional clientEmail and notes", () => {
    expect(createBookingSchema.safeParse({ ...valid, clientEmail: "jane@example.com", notes: "Latex allergy" }).success).toBe(true);
  });

  it("rejects a phone not in E.164 format (missing +)", () => {
    expect(createBookingSchema.safeParse({ ...valid, clientPhone: "50422345678" }).success).toBe(false);
  });

  it("rejects a phone that is just a + sign", () => {
    expect(createBookingSchema.safeParse({ ...valid, clientPhone: "+" }).success).toBe(false);
  });

  it("rejects an empty clientName", () => {
    expect(createBookingSchema.safeParse({ ...valid, clientName: "" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(createBookingSchema.safeParse({ ...valid, clientEmail: "not-an-email" }).success).toBe(false);
  });

  it("rejects a slotStart that is not ISO datetime (no T separator)", () => {
    expect(createBookingSchema.safeParse({ ...valid, slotStart: "2025-06-09 15:00:00" }).success).toBe(false);
  });

  it("rejects notes exceeding 500 characters", () => {
    expect(createBookingSchema.safeParse({ ...valid, notes: "a".repeat(501) }).success).toBe(false);
  });
});
