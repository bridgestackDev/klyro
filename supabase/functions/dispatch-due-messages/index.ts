// Supabase Edge Function — Deno runtime.
// Called by pg_cron every 5 minutes. Dispatches all pending messages whose
// scheduled_at <= now() using the appropriate channel adapter.
// Processes messages serially to stay within Supabase Free tier connection limits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://klyro.app";

// WhatsApp
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";

// Twilio
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_SVC = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";

// Resend
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "hola@klyro.app";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageChannel = "whatsapp" | "sms" | "email";
type MessageType = "confirmation" | "reminder_24h" | "cancellation";

interface DispatchResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

// ── Variable interpolation ────────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_m, key: string) => {
    if (key === "mascota") return vars["mascota"] ?? vars["nombre"] ?? `{${key}}`;
    return vars[key] ?? `{${key}}`;
  });
}

// ── Date/time formatting ──────────────────────────────────────────────────────

function formatDate(iso: string, tz: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-HN", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string, tz: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-HN", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// ── Channel senders ───────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, body: string): Promise<DispatchResult> {
  if (!WA_PHONE_ID || !WA_TOKEN) {
    return { success: false, error: "WhatsApp not configured" };
  }
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
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
  const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
  if (!res.ok || data.error) {
    return { success: false, error: data.error?.message ?? `HTTP ${res.status}` };
  }
  return { success: true, providerMessageId: data.messages?.[0]?.id };
}

async function sendSMS(to: string, body: string): Promise<DispatchResult> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_SVC) {
    return { success: false, error: "Twilio not configured" };
  }
  const encoded = new URLSearchParams({ Body: body, To: to, MessagingServiceSid: TWILIO_SVC });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encoded.toString(),
    },
  );
  const data = await res.json() as { sid?: string; message?: string };
  if (!res.ok) return { success: false, error: data.message ?? `HTTP ${res.status}` };
  return { success: true, providerMessageId: data.sid };
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  businessName: string,
): Promise<DispatchResult> {
  if (!RESEND_KEY) return { success: false, error: "Resend not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${businessName} <${RESEND_FROM}>`,
      to,
      subject,
      text: body,
    }),
  });
  const data = await res.json() as { id?: string; message?: string };
  if (!res.ok) return { success: false, error: data.message ?? `HTTP ${res.status}` };
  return { success: true, providerMessageId: data.id };
}

// ── Channel resolution ────────────────────────────────────────────────────────

function resolveChannel(
  clientWhatsapp: string | null,
  clientPhone: string | null,
  clientEmail: string | null,
  branchWhatsapp: string | null,
): MessageChannel | null {
  if (clientWhatsapp && branchWhatsapp) return "whatsapp";
  if (clientPhone) return "sms";
  if (clientEmail) return "email";
  return null;
}

// ── Build email subject ───────────────────────────────────────────────────────

function buildSubject(type: MessageType, businessName: string, lang: string): string {
  if (lang === "en") {
    if (type === "confirmation") return `Appointment confirmed — ${businessName}`;
    if (type === "reminder_24h") return `Appointment reminder — ${businessName}`;
    return `Appointment cancelled — ${businessName}`;
  }
  if (type === "confirmation") return `Cita confirmada — ${businessName}`;
  if (type === "reminder_24h") return `Recordatorio de cita — ${businessName}`;
  return `Cita cancelada — ${businessName}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Fetch all due pending messages (limit 100 per cycle)
  const { data: pendingMessages, error: fetchError } = await supabase
    .from("messages")
    .select("id")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(100);

  if (fetchError) {
    console.error("[dispatch] fetch error:", fetchError.message);
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  let dispatched = 0;
  let failed = 0;

  // Process serially to avoid connection pool exhaustion on Free tier
  for (const { id: messageId } of pendingMessages ?? []) {
    try {
      // Load full message context
      const { data: msg, error: msgError } = await supabase
        .from("messages")
        .select(`
          id, type,
          appointment:appointments (
            id, starts_at, cancel_token, status,
            branch:branches ( name, address, timezone, whatsapp_number ),
            business:businesses ( name, slug, vertical, default_language ),
            client:clients ( full_name, phone, email, whatsapp_number, preferred_language ),
            staff:staff ( display_name ),
            service:services ( name )
          )
        `)
        .eq("id", messageId)
        .single();

      if (msgError || !msg?.appointment) {
        console.error(`[dispatch] message ${messageId}: not found`);
        await supabase
          .from("messages")
          .update({ status: "failed", error: "appointment data not found" })
          .eq("id", messageId);
        failed++;
        continue;
      }

      // Normalise Supabase join results (may be arrays in some SDK versions)
      const appt = Array.isArray(msg.appointment) ? msg.appointment[0] : msg.appointment;
      const branch = Array.isArray(appt.branch) ? appt.branch[0] : appt.branch;
      const business = Array.isArray(appt.business) ? appt.business[0] : appt.business;
      const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
      const staff = Array.isArray(appt.staff) ? appt.staff[0] : appt.staff;
      const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;

      const lang = (client.preferred_language ?? business.default_language ?? "es") as string;
      const type = msg.type as MessageType;
      const vertical = business.vertical as string;

      const channel = resolveChannel(
        client.whatsapp_number,
        client.phone,
        client.email,
        branch.whatsapp_number,
      );

      if (!channel) {
        await supabase
          .from("messages")
          .update({ status: "failed", error: "no channel available" })
          .eq("id", messageId);
        failed++;
        continue;
      }

      // Look up template
      const { data: template, error: tmplError } = await supabase
        .from("message_templates")
        .select("content, variables")
        .eq("type", type)
        .eq("channel", channel)
        .eq("language", lang)
        .eq("vertical", vertical)
        .eq("is_active", true)
        .single();

      if (tmplError || !template) {
        await supabase
          .from("messages")
          .update({ status: "failed", error: `no template for (${vertical},${lang},${channel},${type})` })
          .eq("id", messageId);
        failed++;
        continue;
      }

      const tz = branch.timezone ?? "America/Tegucigalpa";
      const vars: Record<string, string> = {
        nombre: client.full_name.split(" ")[0] ?? client.full_name,
        fecha: formatDate(appt.starts_at, tz, lang),
        hora: formatTime(appt.starts_at, tz, lang),
        staff: staff.display_name,
        negocio: business.name,
        servicio: service.name,
        dirección: branch.address ?? "",
        sucursal: branch.name,
        cancel_link: `${APP_URL}/api/appointments/${appt.id}/cancel`,
        link: `${APP_URL}/${business.slug}`,
      };

      const body = interpolate(template.content, vars);

      // Dispatch
      let result: DispatchResult;
      if (channel === "whatsapp") {
        result = await sendWhatsApp(client.whatsapp_number!, body);
      } else if (channel === "sms") {
        result = await sendSMS(client.phone!, body);
      } else {
        const subject = buildSubject(type, business.name, lang);
        result = await sendEmail(client.email!, subject, body, business.name);
      }

      if (result.success) {
        await supabase
          .from("messages")
          .update({
            status: "sent",
            provider_message_id: result.providerMessageId ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", messageId);
        dispatched++;
        console.log(`[dispatch] sent ${messageId} via ${channel}`);
      } else {
        await supabase
          .from("messages")
          .update({ status: "failed", error: result.error ?? "unknown" })
          .eq("id", messageId);
        failed++;
        console.error(`[dispatch] failed ${messageId}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[dispatch] exception for ${messageId}:`, err);
      await supabase
        .from("messages")
        .update({ status: "failed", error: String(err) })
        .eq("id", messageId);
      failed++;
    }
  }

  return Response.json({ dispatched, failed });
});
