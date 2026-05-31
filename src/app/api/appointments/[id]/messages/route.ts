import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get delivery status for all messages linked to an appointment.
 * @description Returns message rows for the given appointment. Session required;
 *   RLS ensures the caller can only see messages for their own business's appointments.
 * @response 200:messageStatusResponseSchema: Message statuses retrieved
 * @add 401:errorResponseSchema: No authenticated session
 * @add 404:errorResponseSchema: Appointment not found or not accessible
 * @tag Messaging
 * @openapi
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: appointmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  // RLS enforces business isolation — if this appointment doesn't belong to
  // the session user's business, the query returns zero rows.
  const { data: messages, error } = await supabase
    .from("messages")
    .select(
      "id, type, channel, status, scheduled_at, sent_at, provider_message_id",
    )
    .eq("appointment_id", appointmentId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }

  // If the appointment exists but the user can't see it, messages will be [].
  // We distinguish "appointment has no messages yet" from "not found" using
  // a follow-up check on the appointments table only if messages is empty.
  if (messages.length === 0) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (!appt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Appointment not found." } },
        { status: 404 },
      );
    }
  }

  const data = messages.map((m) => ({
    id: m.id,
    type: m.type,
    channel: m.channel,
    status: m.status,
    scheduledAt: m.scheduled_at,
    sentAt: m.sent_at,
    providerMessageId: m.provider_message_id,
  }));

  return NextResponse.json({
    data,
    _links: {
      self: {
        href: `/api/appointments/${appointmentId}/messages`,
        method: "GET",
      },
      appointment: {
        href: `/api/appointments/${appointmentId}`,
        method: "GET",
      },
    },
  });
}
