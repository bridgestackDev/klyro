import { type NextRequest, NextResponse } from "next/server";
import { getRequestLogger } from "./logger";

type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

/**
 * Wraps a Next.js route handler with structured request/response logging.
 * Logs method, path, status code, and duration on every request.
 * Usage: export const GET = withRequestLogging("/api/bookings", handler);
 */
export function withRequestLogging(route: string, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const reqId = crypto.randomUUID();
    const log = getRequestLogger(reqId, route);
    const start = Date.now();

    log.info("request", { method: req.method, url: req.nextUrl.pathname });

    try {
      const res = await handler(req, ctx);
      log.info("response", { status: res.status, durationMs: Date.now() - start });
      return res;
    } catch (err) {
      log.error("unhandled error in route handler", {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      });
      return NextResponse.json({ code: "INTERNAL", message: "An unexpected error occurred" }, { status: 500 });
    }
  };
}
