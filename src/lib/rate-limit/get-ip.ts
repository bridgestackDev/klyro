import { type NextRequest } from "next/server";

/**
 * Extracts the client IP from a Next.js request, preferring the
 * Vercel-injected header and falling back to standard proxy headers.
 * Returns "anonymous" if no IP can be determined (e.g. local dev).
 */
export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}
