import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/log";
import type { MessageChannel } from "./types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Inserts pending message rows for a newly-created appointment.
 * Always creates a confirmation (scheduled_at = now).
 * Creates a reminder_24h only when starts_at is more than 24 hours away.
 *
 * A failure here MUST NOT fail the booking — callers should catch or void.
 */
export async function scheduleMessages(
  appointmentId: string,
  startsAt: string,
  businessId: string,
  branchId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: branch } = await supabase
    .from("branches")
    .select("whatsapp_number")
    .eq("id", branchId)
    .single();

  const channel: MessageChannel = branch?.whatsapp_number ? "whatsapp" : "email";

  const now = Date.now();
  const startsAtMs = new Date(startsAt).getTime();
  const shouldScheduleReminder = startsAtMs - now > TWENTY_FOUR_HOURS_MS;

  const messages: Array<{
    appointment_id: string;
    business_id: string;
    type: string;
    channel: string;
    status: string;
    scheduled_at: string;
  }> = [
    {
      appointment_id: appointmentId,
      business_id: businessId,
      type: "confirmation",
      channel,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    },
  ];

  if (shouldScheduleReminder) {
    messages.push({
      appointment_id: appointmentId,
      business_id: businessId,
      type: "reminder_24h",
      channel,
      status: "pending",
      scheduled_at: new Date(startsAtMs - TWENTY_FOUR_HOURS_MS).toISOString(),
    });
  }

  const { error } = await supabase.from("messages").insert(messages);

  if (error) {
    logger.error("scheduleMessages insert failed", {
      appointmentId,
      error: error.message,
    });
    throw error;
  }
}
