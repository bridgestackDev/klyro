import { describe, it, expect, vi, beforeEach } from "vitest";

// ── PassthroughLimiter (no Upstash env vars) ─────────────────────────────────

vi.mock("@upstash/redis", () => ({
  Redis: class {
    static fromEnv() { return new this(); }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._args: unknown[]) {}
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return { type: "slidingWindow" };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(..._args: unknown[]) {}
    async limit() {
      return { success: true, limit: 30, remaining: 29, reset: 0 };
    }
  },
}));

describe("createLimiter — passthrough when Upstash env vars absent", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // Clear module cache so the singleton redis instance is reset
    vi.resetModules();
  });

  it("returns success:true when UPSTASH_REDIS_REST_URL is not set", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { createLimiter } = await import("../client");
    const limiter = createLimiter(5, 60);
    const result = await limiter.limit("test-id");
    expect(result.success).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(5);
  });

  it("passthrough always returns full remaining count", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { createLimiter } = await import("../client");
    const limiter = createLimiter(10, 30);
    const r1 = await limiter.limit("user-a");
    const r2 = await limiter.limit("user-a");
    const r3 = await limiter.limit("user-a");
    // Passthrough never decrements
    expect(r1.remaining).toBe(10);
    expect(r2.remaining).toBe(10);
    expect(r3.remaining).toBe(10);
  });
});

// ── Upstash-backed limiter (env vars present) ─────────────────────────────────

describe("createLimiter — Upstash when env vars are set", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("constructs a Ratelimit when both Upstash env vars are present", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-abc");
    const { createLimiter } = await import("../client");
    const limiter = createLimiter(30, 60);
    // The mocked Ratelimit always returns success:true
    const result = await limiter.limit("user-xyz");
    expect(result.success).toBe(true);
    expect(result.limit).toBe(30);
  });
});

// ── getIp ─────────────────────────────────────────────────────────────────────

describe("getIp", () => {
  function makeReq(headers: Record<string, string>) {
    return {
      headers: {
        get: (key: string) => headers[key] ?? null,
      },
    } as unknown as import("next/server").NextRequest;
  }

  it("prefers x-real-ip", async () => {
    const { getIp } = await import("../get-ip");
    expect(getIp(makeReq({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("falls back to cf-connecting-ip", async () => {
    const { getIp } = await import("../get-ip");
    expect(getIp(makeReq({ "cf-connecting-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("parses first IP from x-forwarded-for", async () => {
    const { getIp } = await import("../get-ip");
    expect(getIp(makeReq({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }))).toBe("10.0.0.1");
  });

  it("returns anonymous when no IP header present", async () => {
    const { getIp } = await import("../get-ip");
    expect(getIp(makeReq({}))).toBe("anonymous");
  });

  it("x-real-ip takes priority over x-forwarded-for", async () => {
    const { getIp } = await import("../get-ip");
    expect(getIp(makeReq({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
  });
});

// ── limiters lazy singletons ──────────────────────────────────────────────────

describe("pre-defined limiters", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  it("getSlugCheckLimiter returns a limiter that allows requests", async () => {
    const { getSlugCheckLimiter } = await import("../limiters");
    const result = await getSlugCheckLimiter().limit("user-1");
    expect(result.success).toBe(true);
  });

  it("getBookingLimiter returns a limiter that allows requests", async () => {
    const { getBookingLimiter } = await import("../limiters");
    const result = await getBookingLimiter().limit("user-2");
    expect(result.success).toBe(true);
  });

  it("getAuthLimiter returns a limiter that allows requests", async () => {
    const { getAuthLimiter } = await import("../limiters");
    const result = await getAuthLimiter().limit("user-3");
    expect(result.success).toBe(true);
  });

  it("getGenericLimiter returns a limiter that allows requests", async () => {
    const { getGenericLimiter } = await import("../limiters");
    const result = await getGenericLimiter().limit("user-4");
    expect(result.success).toBe(true);
  });
});
