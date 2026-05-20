import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export interface Limiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

/** Used when Upstash env vars are absent (local dev / CI). Always allows. */
class PassthroughLimiter implements Limiter {
  private readonly _limit: number;
  constructor(limit: number) {
    this._limit = limit;
  }
  async limit(): Promise<RateLimitResult> {
    return { success: true, limit: this._limit, remaining: this._limit, reset: 0 };
  }
}

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Creates a rate limiter backed by Upstash Redis when env vars are present.
 * Falls back to a passthrough (always-allows) when they are absent so local
 * dev and CI work without Redis credentials.
 */
export function createLimiter(requests: number, windowSeconds: number): Limiter {
  const redis = getRedis();
  if (!redis) return new PassthroughLimiter(requests);

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  });
}
