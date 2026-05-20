import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub pino before importing logger
vi.mock("pino", () => {
  const childMock = vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }));
  const pinoMock = vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: childMock,
  }));
  return { default: pinoMock };
});

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exposes debug, info, warn, error methods", async () => {
    const { logger } = await import("../logger");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("logger.debug does not throw", async () => {
    const { logger } = await import("../logger");
    expect(() => logger.debug("test message")).not.toThrow();
  });

  it("logger.info does not throw", async () => {
    const { logger } = await import("../logger");
    expect(() => logger.info("info message", { key: "value" })).not.toThrow();
  });

  it("logger.warn does not throw (Sentry no-op)", async () => {
    const { logger } = await import("../logger");
    expect(() => logger.warn("warn message")).not.toThrow();
  });

  it("logger.error does not throw (Sentry no-op)", async () => {
    const { logger } = await import("../logger");
    expect(() => logger.error("error message", { err: "oops" })).not.toThrow();
  });
});

describe("getRequestLogger", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns an object with debug, info, warn, error", async () => {
    const { getRequestLogger } = await import("../logger");
    const log = getRequestLogger("req-123", "/api/test");
    expect(typeof log.debug).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");
  });

  it("each method does not throw", async () => {
    const { getRequestLogger } = await import("../logger");
    const log = getRequestLogger("req-abc", "/api/slots");
    expect(() => log.debug("debug")).not.toThrow();
    expect(() => log.info("info")).not.toThrow();
    expect(() => log.warn("warn")).not.toThrow();
    expect(() => log.error("error")).not.toThrow();
  });
});

describe("withRequestLogging", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("passes through a successful response", async () => {
    const { withRequestLogging } = await import("../with-request-logging");
    const { NextResponse } = await import("next/server");

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withRequestLogging("/api/test", handler);

    const fakeReq = {
      method: "GET",
      nextUrl: { pathname: "/api/test" },
    } as unknown as import("next/server").NextRequest;

    const res = await wrapped(fakeReq, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns 500 when handler throws", async () => {
    const { withRequestLogging } = await import("../with-request-logging");

    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const wrapped = withRequestLogging("/api/test", handler);

    const fakeReq = {
      method: "POST",
      nextUrl: { pathname: "/api/test" },
    } as unknown as import("next/server").NextRequest;

    const res = await wrapped(fakeReq, { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("INTERNAL");
  });
});
