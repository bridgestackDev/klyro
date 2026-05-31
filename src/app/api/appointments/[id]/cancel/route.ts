import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCancelLimiter } from "@/lib/rate-limit/limiters";
import { getIp } from "@/lib/rate-limit/get-ip";
import { logger } from "@/lib/log";

const cancelAppointmentSchema = z.object({
  token: z.string().uuid(),
});

function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf-8");
    const bBuf = Buffer.from(b, "utf-8");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Cancel an appointment via a client-held cancel token.
 * @description Public endpoint — no session required. Authenticated via
 *   `token` (UUID) that was delivered in the confirmation message. Cancels
 *   the appointment, voids the pending reminder, and schedules a
 *   cancellation message.
 * @body cancelAppointmentSchema
 * @response 200:cancelResponseSchema: Appointment cancelled successfully
 * @add 400:errorResponseSchema: Validation failed (invalid UUID format)
 * @add 404:errorResponseSchema: Appointment not found or token invalid
 * @add 409:errorResponseSchema: Appointment already in a terminal state
 * @add 429:errorResponseSchema: Rate limit exceeded
 * @tag Appointments
 * @openapi
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rl = await getCancelLimiter().limit(getIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 },
    );
  }

  const { id: appointmentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Request body must be valid JSON.", field: "" } },
      { status: 400 },
    );
  }

  const parsed = cancelAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: e.message, field: e.path.join(".") } },
      { status: 400 },
    );
  }

  const { token } = parsed.data;
  const supabase = createAdminClient();

  // Fetch appointment — intentionally uses a single query to avoid leaking
  // whether the appointment exists via timing differences.
  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status, cancel_token, business_id, branch_id, cancelled_at")
    .eq("id", appointmentId)
    .maybeSingle();

  // Deliberate ambiguity: same 404 for both "not found" and "wrong token"
  if (fetchError || !appointment || !safeEqual(appointment.cancel_token, token)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Appointment not found or token invalid." } },
      { status: 404 },
    );
  }

  const terminalStatuses = ["cancelled", "completed", "noshow"];
  if (terminalStatuses.includes(appointment.status)) {
    return NextResponse.json(
      { error: { code: "BOOKING_CONFLICT", message: "This appointment has already been cancelled." } },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  // 1. Cancel the appointment
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: now })
    .eq("id", appointmentId);

  if (updateError) {
    logger.error("cancel: appointment update failed", { appointmentId });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }

  // 2. Void any pending 24h reminder for this appointment
  await supabase
    .from("messages")
    .update({ status: "cancelled", error: "appointment_cancelled" })
    .eq("appointment_id", appointmentId)
    .eq("type", "reminder_24h")
    .eq("status", "pending");

  // 3. Determine channel from existing confirmation message (reuse same channel)
  const { data: confMsg } = await supabase
    .from("messages")
    .select("channel")
    .eq("appointment_id", appointmentId)
    .eq("type", "confirmation")
    .maybeSingle();

  const channel = confMsg?.channel ?? "email";

  // 4. Insert cancellation message
  await supabase.from("messages").insert({
    appointment_id: appointmentId,
    business_id: appointment.business_id,
    type: "cancellation",
    channel,
    status: "pending",
    scheduled_at: now,
  });

  logger.info("appointment cancelled", { appointmentId });

  return NextResponse.json({
    data: {
      id: appointmentId,
      status: "cancelled",
      cancelledAt: now,
    },
    _links: {
      self: { href: `/api/appointments/${appointmentId}/cancel`, method: "POST" },
      book: { href: "/api/booking/create", method: "POST" },
    },
  });
}
