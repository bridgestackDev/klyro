import { env } from "@/lib/env";
import { logger } from "@/lib/log";
import type { ChannelResult } from "../types";

interface WhatsAppResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code?: number };
}

export async function sendWhatsApp(
  to: string,
  body: string,
  messageId: string,
): Promise<ChannelResult> {
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, error: "WhatsApp credentials not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );

    const data = (await response.json()) as WhatsAppResponse;

    if (!response.ok || data.error) {
      const errMsg = data.error?.message ?? `HTTP ${response.status}`;
      logger.error("whatsapp send failed", { messageId, status: response.status });
      return { success: false, error: errMsg };
    }

    const providerMessageId = data.messages?.[0]?.id;
    logger.info("whatsapp sent", { messageId, channel: "whatsapp", status: "sent" });
    return { success: true, providerMessageId };
  } catch (err) {
    logger.error("whatsapp send error", { messageId });
    return { success: false, error: String(err) };
  }
}
