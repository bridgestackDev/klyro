import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError, z } from "zod";

// Mock next/server before importing toErrorResponse
vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
        _body: body,
        _status: init?.status ?? 200,
        _headers: init?.headers ?? {},
      }),
    },
  };
});

// Import after mock is set up
const { toErrorResponse } = await import("../to-response");
const { ApiError, ERROR_CODES } = await import("../api-error");

type FakeResponse = { _body: Record<string, unknown>; _status: number; _headers: Record<string, string> };

describe("toErrorResponse — ApiError", () => {
  it("maps ApiError to the correct status and code", () => {
    const err = ApiError.unauthorized();
    const res = toErrorResponse(err) as unknown as FakeResponse;
    expect(res._status).toBe(401);
    expect(res._body["code"]).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it("includes fieldErrors when present", () => {
    const err = ApiError.validation({ name: "Required" });
    const res = toErrorResponse(err) as unknown as FakeResponse;
    expect(res._status).toBe(400);
    expect(res._body["fieldErrors"]).toEqual({ name: "Required" });
  });

  it("includes retryAfter for rate-limited errors", () => {
    const err = ApiError.rateLimited(60);
    const res = toErrorResponse(err) as unknown as FakeResponse;
    expect(res._status).toBe(429);
    expect(res._body["retryAfter"]).toBe(60);
  });

  it("sets X-Request-ID header", () => {
    const res = toErrorResponse(ApiError.internal()) as unknown as FakeResponse;
    expect(typeof res._headers["X-Request-ID"]).toBe("string");
    expect(res._headers["X-Request-ID"]).toHaveLength(36); // UUID
  });
});

describe("toErrorResponse — ZodError", () => {
  it("returns 400 with VALIDATION_FAILED and fieldErrors", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const res = toErrorResponse(result.error) as unknown as FakeResponse;
      expect(res._status).toBe(400);
      expect(res._body["code"]).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(res._body["fieldErrors"]).toHaveProperty("email");
    }
  });

  it("handles ZodError with root-level errors gracefully", () => {
    const zodErr = new ZodError([
      { code: "custom", message: "Top-level error", path: [] },
    ]);
    const res = toErrorResponse(zodErr) as unknown as FakeResponse;
    expect(res._status).toBe(400);
    expect(res._body["code"]).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
});

describe("toErrorResponse — PostgrestError 23505", () => {
  it("maps Postgres unique violation to SLUG_TAKEN / 409", () => {
    const pgError = { code: "23505", message: "duplicate key value", details: "Key (slug)=..." };
    const res = toErrorResponse(pgError) as unknown as FakeResponse;
    expect(res._status).toBe(409);
    expect(res._body["code"]).toBe(ERROR_CODES.SLUG_TAKEN);
  });

  it("maps other Postgres error codes to INTERNAL / 500", () => {
    const pgError = { code: "42703", message: "column does not exist" };
    const res = toErrorResponse(pgError) as unknown as FakeResponse;
    expect(res._status).toBe(500);
    expect(res._body["code"]).toBe(ERROR_CODES.INTERNAL);
  });
});

describe("toErrorResponse — unknown errors", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns INTERNAL / 500 for plain Error", () => {
    const err = new Error("something unexpected");
    const res = toErrorResponse(err) as unknown as FakeResponse;
    expect(res._status).toBe(500);
    expect(res._body["code"]).toBe(ERROR_CODES.INTERNAL);
  });

  it("returns INTERNAL / 500 for non-Error thrown value", () => {
    const res = toErrorResponse("a string error") as unknown as FakeResponse;
    expect(res._status).toBe(500);
    expect(res._body["code"]).toBe(ERROR_CODES.INTERNAL);
  });

  it("logs the cause for unknown errors via logger.error", async () => {
    const logModule = await import("@/lib/log");
    const spy = vi.spyOn(logModule.logger, "error");
    toErrorResponse(new Error("logged cause"));
    expect(spy).toHaveBeenCalled();
  });
});
