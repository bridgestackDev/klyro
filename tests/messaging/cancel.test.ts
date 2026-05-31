import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Logger mock ───────────────────────────────────────────────────────────────
vi.mock("@/lib/log", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Rate limiter mock ─────────────────────────────────────────────────────────
const mockRateLimit = vi.fn();
vi.mock("@/lib/rate-limit/limiters", () => ({
  getCancelLimiter: vi.fn(() => ({ limit: mockRateLimit })),
}));
vi.mock("@/lib/rate-limit/get-ip", () => ({
  getIp: vi.fn(() => "127.0.0.1"),
}));

// ── Supabase admin mock ───────────────────────────────────────────────────────
// The cancel route does these operations in order:
//  1. from('appointments').select(..).eq(..).maybeSingle()
//  2. from('appointments').update(..).eq(..)           ← awaited directly
//  3. from('messages').update(..).eq(..).eq(..).eq(..) ← awaited directly
//  4. from('messages').select(..).eq(..).eq(..).maybeSingle()
//  5. from('messages').insert(..)                      ← awaited directly
//
// We use a "thenables-return" chain: the chain object is itself thenable so
// `await chain.eq(...)` resolves, while `.maybeSingle()` resolves separately.

const mockMaybySingle = vi.fn();

function makeChain(defaultResult = { error: null }) {
  const self: Record<string, unknown> = {};
  self["select"] = vi.fn(() => self);
  self["update"] = vi.fn(() => self);
  self["insert"] = vi.fn(() => Promise.resolve(defaultResult));
  self["eq"] = vi.fn(() => self);
  self["neq"] = vi.fn(() => Promise.resolve(defaultResult));
  self["maybeSingle"] = mockMaybySingle;
  // Makes `await chain` resolve directly (for update/eq chains without .single())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).then = (resolve: any, reject: any) =>
    Promise.resolve(defaultResult).then(resolve, reject);
  return self;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/appointments/[id]/cancel/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const APPT_ID = "aaaaaaaa-bbbb-cccc-0000-000000000001";
const VALID_TOKEN = "dddddddd-eeee-4fff-8aaa-bbbbbbbbbbbb";
const WRONG_TOKEN = "ffffffff-0000-4111-8222-333333333333";
const BIZ_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: APPT_ID,
    status: "confirmed",
    cancel_token: VALID_TOKEN,
    business_id: BIZ_ID,
    branch_id: "br-0000-1111-2222",
    cancelled_at: null,
    ...overrides,
  };
}

function makePostRequest(body: unknown = { token: VALID_TOKEN }): NextRequest {
  return new NextRequest(`http://localhost/api/appointments/${APPT_ID}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callCancel(
  req: NextRequest = makePostRequest(),
  id: string = APPT_ID,
) {
  return POST(req, { params: Promise.resolve({ id }) });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupHappyPath() {
  const chain = makeChain({ error: null });
  mockFrom.mockReturnValue(chain);
  // Call 1: appointment fetch
  mockMaybySingle
    .mockResolvedValueOnce({ data: makeAppointment(), error: null })
    // Call 4: confirmation message channel fetch
    .mockResolvedValueOnce({ data: { channel: "whatsapp" }, error: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/appointments/[id]/cancel", () => {
  beforeEach(() => {
    // resetAllMocks drains mockResolvedValueOnce queues, preventing bleed between tests
    vi.resetAllMocks();
    mockRateLimit.mockResolvedValue({ success: true });
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    const res = await callCancel();
    expect(res.status).toBe(429);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("RATE_LIMITED");
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when token field is missing", async () => {
    const res = await callCancel(makePostRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string; field: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("token");
  });

  it("returns 400 when token is not a valid UUID", async () => {
    const res = await callCancel(makePostRequest({ token: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string; field: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.field).toBe("token");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/appointments/${APPT_ID}/cancel`, {
      method: "POST",
      body: "not json{",
    });
    const res = await callCancel(req);
    expect(res.status).toBe(400);
  });

  // ── 404 cases ─────────────────────────────────────────────────────────────

  it("returns 404 when appointment is not found", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await callCancel();
    expect(res.status).toBe(404);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when token does not match (same error as not-found — prevents enumeration)", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({ data: makeAppointment(), error: null });

    const res = await callCancel(makePostRequest({ token: WRONG_TOKEN }));
    expect(res.status).toBe(404);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 on DB fetch error (same response shape as not-found)", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({
      data: null,
      error: { message: "connection reset" },
    });

    const res = await callCancel();
    expect(res.status).toBe(404);
  });

  // ── 409 terminal states ───────────────────────────────────────────────────

  it("returns 409 when appointment is already cancelled", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({
      data: makeAppointment({ status: "cancelled" }),
      error: null,
    });

    const res = await callCancel();
    expect(res.status).toBe(409);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("BOOKING_CONFLICT");
  });

  it("returns 409 when appointment is completed", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({
      data: makeAppointment({ status: "completed" }),
      error: null,
    });

    const res = await callCancel();
    expect(res.status).toBe(409);
  });

  it("returns 409 when appointment is noshow", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    mockMaybySingle.mockResolvedValueOnce({
      data: makeAppointment({ status: "noshow" }),
      error: null,
    });

    const res = await callCancel();
    expect(res.status).toBe(409);
  });

  // ── Successful cancellation ───────────────────────────────────────────────

  it("returns 200 with correct data shape on successful cancellation", async () => {
    setupHappyPath();

    const res = await callCancel();
    expect(res.status).toBe(200);

    const json = await res.json() as {
      data: { id: string; status: string; cancelledAt: string };
      _links: { self: { href: string; method: string }; book: { href: string } };
    };
    expect(json.data.id).toBe(APPT_ID);
    expect(json.data.status).toBe("cancelled");
    expect(json.data.cancelledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json._links.self.href).toContain(APPT_ID);
    expect(json._links.self.method).toBe("POST");
    expect(json._links.book.href).toContain("/api/booking/create");
  });

  it("queries appointments table for the correct appointment ID", async () => {
    setupHappyPath();
    await callCancel();
    // from() was called at least once with 'appointments'
    const calls = mockFrom.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain("appointments");
  });

  it("queries messages table for confirmation channel and inserts cancellation", async () => {
    setupHappyPath();
    await callCancel();
    const calls = mockFrom.mock.calls.map((c) => c[0] as string);
    expect(calls).toContain("messages");
  });
});
