import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// vi.mock is hoisted — these run before any import
vi.mock("@/lib/booking/slots", () => ({
  getAvailableSlots: vi.fn(),
}));

vi.mock("@/lib/rate-limit/get-ip", () => ({
  getIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/log/with-request-logging", () => ({
  withRequestLogging: (_route: string, handler: unknown) => handler,
}));

// Import mocked modules after vi.mock declarations
import { GET } from "@/app/api/booking/slots/route";
import { getAvailableSlots } from "@/lib/booking/slots";
import { getBookingLimiter } from "@/lib/rate-limit/limiters";

const UUID = "00000000-0000-4000-8000-000000000001";
const BASE = "http://localhost/api/booking/slots";

function makeRequest(params: Record<string, string>) {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const CTX = { params: Promise.resolve({}) } as { params: Promise<Record<string, string>> };

describe("GET /api/booking/slots", () => {
  beforeEach(() => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]);
  });

  it("returns 200 with slots, meta, and _links for a valid query", async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([
      { startsAt: "2025-06-09T15:00:00.000Z", endsAt: "2025-06-09T15:30:00.000Z" },
      { startsAt: "2025-06-09T15:35:00.000Z", endsAt: "2025-06-09T16:05:00.000Z" },
    ]);

    const req = makeRequest({ staffId: UUID, serviceId: UUID, branchId: UUID, date: "2025-06-09" });
    const res = await GET(req, CTX);
    const body = await res.json() as { data: unknown[]; meta: { total: number }; _links: { self: { method: string } } };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body._links.self.method).toBe("GET");
  });

  it("returns 200 with empty data when no slots are available", async () => {
    vi.mocked(getAvailableSlots).mockResolvedValue([]);
    const req = makeRequest({ staffId: UUID, serviceId: UUID, branchId: UUID, date: "2025-06-09" });
    const res = await GET(req, CTX);
    const body = await res.json() as { data: unknown[]; meta: { total: number } };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  it("returns 400 when staffId is not a UUID", async () => {
    const req = makeRequest({ staffId: "bad-id", serviceId: UUID, branchId: UUID, date: "2025-06-09" });
    const res = await GET(req, CTX);
    const body = await res.json() as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when date is missing", async () => {
    const req = makeRequest({ staffId: UUID, serviceId: UUID, branchId: UUID });
    const res = await GET(req, CTX);
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is in the wrong format", async () => {
    const req = makeRequest({ staffId: UUID, serviceId: UUID, branchId: UUID, date: "06-09-2025" });
    const res = await GET(req, CTX);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    // Temporarily override the limiter for this test
    const original = getBookingLimiter;
    vi.spyOn(await import("@/lib/rate-limit/limiters"), "getBookingLimiter").mockReturnValueOnce({
      limit: vi.fn().mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60000 }),
    });

    const req = makeRequest({ staffId: UUID, serviceId: UUID, branchId: UUID, date: "2025-06-09" });
    const res = await GET(req, CTX);
    expect(res.status).toBe(429);

    void original; // suppress unused warning
  });
});
