import { type NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/log";

const TWILIO_STATUS_MAP: Record<string, string> = {
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
};

/** POST — Twilio SMS delivery status webhook (form-encoded body) */
export async function POST(request: NextRequest): Promise<Response> {
  const authToken = env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return new Response("Forbidden", { status: 403 });
  }

  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = request.url;

  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const messageSid = params["MessageSid"] ?? "";
  const twilioStatus = params["MessageStatus"] ?? "";
  const klyroStatus = TWILIO_STATUS_MAP[twilioStatus];

  if (!klyroStatus || !messageSid) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("messages")
    .update({ status: klyroStatus })
    .eq("provider_message_id", messageSid)
    .neq("status", "delivered");

  if (error) {
    logger.error("twilio webhook db update failed", { messageSid, klyroStatus });
  } else {
    logger.info("twilio status updated", {
      providerMessageId: messageSid,
      channel: "sms",
      status: klyroStatus,
    });
  }

  return NextResponse.json({ received: true });
}
