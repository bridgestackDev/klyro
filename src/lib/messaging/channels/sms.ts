import twilio from "twilio";
import { parsePhoneNumber } from "libphonenumber-js";
import { env } from "@/lib/env";
import { logger } from "@/lib/log";
import type { ChannelResult } from "../types";

function normalizePhone(phone: string): string {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed.format("E.164");
  } catch {
    // Not parseable — pass through and let Twilio validate
    return phone;
  }
}

export async function sendSMS(
  to: string,
  body: string,
  messageId: string,
): Promise<ChannelResult> {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const client = twilio(accountSid, authToken);
    const e164 = normalizePhone(to);

    const msg = await client.messages.create({
      body,
      to: e164,
      messagingServiceSid,
    });

    logger.info("sms sent", { messageId, channel: "sms", status: "sent" });
    return { success: true, providerMessageId: msg.sid };
  } catch (err) {
    logger.error("sms send error", { messageId });
    return { success: false, error: String(err) };
  }
}
