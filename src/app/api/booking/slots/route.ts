import { type NextRequest, NextResponse } from "next/server";
import { slotsQuerySchema } from "@/lib/schemas/booking";
import { getAvailableSlots } from "@/lib/booking/slots";
import { getBookingLimiter } from "@/lib/rate-limit/limiters";
import { getIp } from "@/lib/rate-limit/get-ip";
import { withRequestLogging } from "@/lib/log/with-request-logging";

async function handler(req: NextRequest) {
  const rl = await getBookingLimiter().limit(getIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  const q = req.nextUrl.searchParams;
  const parsed = slotsQuerySchema.safeParse({
    staffId: q.get("staffId"),
    serviceId: q.get("serviceId"),
    branchId: q.get("branchId"),
    date: q.get("date"),
  });

  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: e.message, field: e.path.join(".") } },
      { status: 400 }
    );
  }

  const slots = await getAvailableSlots(parsed.data);
  const self = req.nextUrl.pathname + req.nextUrl.search;

  return NextResponse.json({
    data: slots,
    meta: { total: slots.length },
    _links: { self: { href: self, method: "GET" } },
  });
}

export const GET = withRequestLogging("/api/booking/slots", handler);
