import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/log";
import type { ChannelResult } from "../types";
import { AppointmentEmail } from "./email-template";

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  businessName: string,
  messageId: string,
): Promise<ChannelResult> {
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    return { success: false, error: "Resend API key not configured" };
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: `${businessName} <${fromEmail}>`,
      to,
      subject,
      react: <AppointmentEmail body={body} businessName={businessName} />,
      text: body,
    });

    if (error) {
      logger.error("email send failed", { messageId, channel: "email" });
      return { success: false, error: error.message };
    }

    logger.info("email sent", { messageId, channel: "email", status: "sent" });
    return { success: true, providerMessageId: data?.id ?? undefined };
  } catch (err) {
    logger.error("email send error", { messageId });
    return { success: false, error: String(err) };
  }
}
