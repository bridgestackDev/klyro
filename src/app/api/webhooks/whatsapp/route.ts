import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/log";

const META_STATUS_MAP: Record<string, string> = {
  sent: "sent",
  delivered: "delivered",
  read: "delivered",
  failed: "failed",
};

function validateSignature(rawBody: string, sigHeader: string | null): boolean {
  const secret = env.WHATSAPP_APP_SECRET;
  if (!secret || !sigHeader) return false;

  const hex = sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : sigHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(hex, "hex");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

/** GET — Meta webhook verification handshake */
export function GET(request: NextRequest): Response {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** POST — Delivery status events from Meta */
export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();

  if (!validateSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = createAdminClient();
  const entries = (payload as { entry?: unknown[] }).entry ?? [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes ?? [];
    for (const change of changes) {
      const statuses =
        (change as { value?: { statuses?: unknown[] } }).value?.statuses ?? [];

      for (const s of statuses) {
        const status = (s as { status?: string }).status ?? "";
        const providerMessageId = (s as { id?: string }).id ?? "";
        const klyroStatus = META_STATUS_MAP[status];

        if (!klyroStatus || !providerMessageId) continue;

        const { error } = await supabase
          .from("messages")
          .update({ status: klyroStatus })
          .eq("provider_message_id", providerMessageId)
          .neq("status", "delivered");

        if (error) {
          logger.error("whatsapp webhook db update failed", {
            providerMessageId,
            klyroStatus,
          });
        } else {
          logger.info("whatsapp status updated", {
            providerMessageId,
            channel: "whatsapp",
            status: klyroStatus,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
