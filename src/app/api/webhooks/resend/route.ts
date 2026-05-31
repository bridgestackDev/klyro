import { type NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/log";

const RESEND_STATUS_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "failed",
  "email.complained": "failed",
};

/** POST — Resend email delivery event webhook */
export async function POST(request: NextRequest): Promise<Response> {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const rawBody = await request.text();

  try {
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const eventType = (payload as { type?: string }).type ?? "";
  const emailId = (
    (payload as { data?: { email_id?: string } }).data?.email_id ?? ""
  );
  const klyroStatus = RESEND_STATUS_MAP[eventType];

  // Unknown event types — acknowledge without side-effects
  if (!klyroStatus || !emailId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("messages")
    .update({ status: klyroStatus })
    .eq("provider_message_id", emailId)
    .neq("status", "delivered");

  if (error) {
    logger.error("resend webhook db update failed", { emailId, klyroStatus });
  } else {
    logger.info("resend status updated", {
      providerMessageId: emailId,
      channel: "email",
      status: klyroStatus,
    });
  }

  return NextResponse.json({ received: true });
}
