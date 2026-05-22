import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/booking/slots", () => ({
  getAvailableSlots: vi.fn(),
}));

vi.mock("@/lib/rate-limit/get-ip", () => ({
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/log/with-request-logging", () => ({
  withRequestLogging: (_route: string, handler: unknown) => handler,
}));

vi.mock("@/lib/log/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// Shared mock chain – all Supabase calls go through these
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

const mockChain: Record<string, unknown> = {};
mockChain.select = vi.fn(() => mockChain);
mockChain.insert = vi.fn(() => mockChain);
mockChain.eq = vi.fn(() => mockChain);
mockChain.single = mockSingle;
mockChain.maybeSingle = mockMaybeSingle;

const mockFrom = vi.fn(() => mockChain);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/booking/create/route";
import { getAvailableSlots } from "@/lib/booking/slots";

const UUID = "00000000-0000-4000-8000-000000000001";
const SLOT_START = "2025-06-09T15:00:00.000Z";
const SLOT_END = "2025-06-09T15:30:00.000Z";

const VALID_BODY = {
  staffId: UUID,
  serviceId: UUID,
  branchId: UUID,
  slotStart: SLOT_START,
  clientName: "Ana López",
  clientPhone: "+50422345678",
};

const CTX = { params: Promise.resolve({}) } as { params: Promise<Record<string, string>> };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/booking/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/booking/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: slot is available
    vi.mocked(getAvailableSlots).mockResolvedValue([{ startsAt: SLOT_START, endsAt: SLOT_END }]);
  });

  it("returns 201 with bookingCode and slot times on happy path", async () => {
    // Sequence of DB calls:
    // 1. branches.select.eq.single → branch data
    mockSingle
      .mockResolvedValueOnce({ data: { business_id: UUID, timezone: "America/Tegucigalpa" }, error: null })
      // 2. clients.insert.select.single → new client (after maybeSingle returns null)
      .mockResolvedValueOnce({ data: { id: UUID }, error: null })
      // 3. appointments.insert.select.single → appointment
      .mockResolvedValueOnce({ data: { id: UUID, starts_at: SLOT_START, ends_at: SLOT_END, booking_code: "KLY-ABCD" }, error: null });

    mockMaybeSingle
      // clients.select.eq.eq.maybeSingle → no existing client
      .mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    const body = await res.json() as { data: { bookingCode: string; startsAt: string; endsAt: string }; _links: unknown };

    expect(res.status).toBe(201);
    expect(body.data.bookingCode).toMatch(/^KLY-[A-Z0-9]{4}$/);
    expect(body.data.startsAt).toBe(SLOT_START);
    expect(body.data.endsAt).toBe(SLOT_END);
    expect(body._links).toBeDefined();
  });

  it("reuses an existing client when the phone already exists for this business", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { business_id: UUID, timezone: "America/Tegucigalpa" }, error: null })
      .mockResolvedValueOnce({ data: { id: UUID, starts_at: SLOT_START, ends_at: SLOT_END, booking_code: "KLY-ABCD" }, error: null });

    // Existing client found
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: UUID }, error: null });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(201);

    // Verify clients.insert was NOT called (chain select/insert spy)
    const insertSpy = mockChain.insert as ReturnType<typeof vi.fn>;
    const insertCalls = insertSpy.mock.calls.filter((args: unknown[]) => {
      const arg = args[0] as Record<string, unknown> | undefined;
      return arg && "full_name" in arg; // client insert has full_name
    });
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 400 when clientPhone is not E.164 format", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, clientPhone: "22345678" }), CTX);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when slotStart is not a valid ISO datetime", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, slotStart: "not-a-date" }), CTX);
    expect(res.status).toBe(400);
  });

  it("returns 400 when clientName is empty", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, clientName: "" }), CTX);
    expect(res.status).toBe(400);
  });

  it("returns 409 SLOT_TAKEN when the requested slot is no longer available", async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]); // no slots

    mockSingle.mockResolvedValueOnce({ data: { business_id: UUID, timezone: "America/Tegucigalpa" }, error: null });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(409);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("SLOT_TAKEN");
  });

  it("returns 409 SLOT_TAKEN when the DB insert fails due to slot overlap", async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { business_id: UUID, timezone: "America/Tegucigalpa" }, error: null })
      .mockResolvedValueOnce({ data: { id: UUID }, error: null })
      // appointment insert fails with slot overlap constraint
      .mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint \"idx_appointments_no_slot_overlap\"", details: "Key (staff_id, starts_at)=(...) already exists." },
      });

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(409);
    const body = await res.json() as { error: { code: string } };
    expect(body.error.code).toBe("SLOT_TAKEN");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.spyOn(await import("@/lib/rate-limit/limiters"), "getBookingLimiter").mockReturnValueOnce({
      limit: vi.fn().mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60000 }),
    });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(429);
  });

  it("returns 404 when the branchId does not exist", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "no rows" } });

    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(404);
  });
});
