import { createLimiter, type Limiter } from "./client";

/**
 * Pre-defined rate limiters for each surface.
 * Instantiated lazily on first use (not at module load) so the Redis
 * connection is only opened when a limiter is actually called.
 */
let _slugCheck: Limiter | null = null;
let _booking: Limiter | null = null;
let _auth: Limiter | null = null;
let _generic: Limiter | null = null;

/** Wizard slug-check endpoint: 30 req / 60 s per IP */
export function getSlugCheckLimiter(): Limiter {
  _slugCheck ??= createLimiter(30, 60);
  return _slugCheck;
}

/** Public booking creation: 10 req / 60 s per IP */
export function getBookingLimiter(): Limiter {
  _booking ??= createLimiter(10, 60);
  return _booking;
}

/** Auth endpoints (magic link / OAuth): 5 req / 300 s per IP */
export function getAuthLimiter(): Limiter {
  _auth ??= createLimiter(5, 300);
  return _auth;
}

/** Generic fallback for unclassified API routes: 60 req / 60 s per IP */
export function getGenericLimiter(): Limiter {
  _generic ??= createLimiter(60, 60);
  return _generic;
}
