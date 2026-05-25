import { type NextRequest, NextResponse } from "next/server";
import { createBookingSchema } from "@/lib/schemas/booking";
import { getAvailableSlots } from "@/lib/booking/slots";
import { generateBookingCode } from "@/lib/booking/booking-code";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookingLimiter } from "@/lib/rate-limit/limiters";
import { getIp } from "@/lib/rate-limit/get-ip";
import { withRequestLogging } from "@/lib/log/with-request-logging";
import { logger } from "@/lib/log";

function utcToLocalDate(utcStr: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcStr));
}

async function handler(req: NextRequest) {
  const rl = await getBookingLimiter().limit(getIp(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON", field: "" } },
      { status: 400 }
    );
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: e.message, field: e.path.join(".") } },
      { status: 400 }
    );
  }

  const { staffId, serviceId, branchId, slotStart, clientName, clientPhone, clientEmail, notes } = parsed.data;
  const supabase = createAdminClient();

  // Get branch to derive business_id and timezone
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("business_id, timezone")
    .eq("id", branchId)
    .single();

  if (branchError || !branch) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Branch not found" } },
      { status: 404 }
    );
  }

  // Verify the requested slot is still available (pre-check before DB insert)
  const localDate = utcToLocalDate(slotStart, branch.timezone);
  const slots = await getAvailableSlots({ staffId, serviceId, branchId, date: localDate });
  const matchingSlot = slots.find((s) => s.startsAt === slotStart);

  if (!matchingSlot) {
    return NextResponse.json(
      { error: { code: "SLOT_TAKEN", message: "This slot is no longer available. Please choose another time." } },
      { status: 409 }
    );
  }

  // Upsert client by phone within this business
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("business_id", branch.business_id)
    .eq("phone", clientPhone)
    .maybeSingle();

  let clientId: string;
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        business_id: branch.business_id,
        full_name: clientName,
        phone: clientPhone,
        email: clientEmail ?? null,
        whatsapp_number: clientPhone,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      logger.error("client upsert failed", { error: clientError });
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
        { status: 500 }
      );
    }
    clientId = newClient.id;
  }

  // Insert appointment — retry up to 5 times on booking_code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const bookingCode = generateBookingCode();

    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .insert({
        business_id: branch.business_id,
        branch_id: branchId,
        staff_id: staffId,
        service_id: serviceId,
        client_id: clientId,
        starts_at: slotStart,
        ends_at: matchingSlot.endsAt,
        status: "pending",
        booking_code: bookingCode,
        notes: notes ?? null,
      })
      .select("id, starts_at, ends_at, booking_code")
      .single();

    if (!apptError) {
      return NextResponse.json(
        {
          data: {
            bookingCode: appt.booking_code as string,
            startsAt: appt.starts_at as string,
            endsAt: appt.ends_at as string,
          },
          _links: { self: { href: "/api/booking/create", method: "POST" } },
        },
        { status: 201 }
      );
    }

    if (apptError.code === "23505") {
      // Distinguish slot overlap vs. booking_code collision by constraint name in details
      const isBookingCodeCollision =
        typeof apptError.details === "string" && apptError.details.includes("booking_code");

      if (!isBookingCodeCollision) {
        return NextResponse.json(
          { error: { code: "SLOT_TAKEN", message: "This slot was just taken. Please choose another time." } },
          { status: 409 }
        );
      }
      // booking_code collision — retry with a new code
      continue;
    }

    logger.error("appointment insert failed", { error: apptError });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Could not generate a unique booking code. Please try again." } },
    { status: 500 }
  );
}

/**
 * Create a booking appointment
 * @description Books a slot for a client. Verifies availability, upserts the client by phone, and creates the appointment with a unique KLY-XXXX booking code.
 * @body createBookingSchema
 * @tag Booking
 * @openapi
 */
export const POST = withRequestLogging("/api/booking/create", handler);
