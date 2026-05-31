import { z } from "zod";

// ── Client-side env vars (NEXT_PUBLIC_*) ──────────────────────────────────────
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Klyro"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

// ── Server-only env vars ──────────────────────────────────────────────────────
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),

  // WhatsApp Cloud API
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),

  // Twilio SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),

  // Resend Email
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default("hola@klyro.app"),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // Observability
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Logging — optional, sensible defaults in logger.ts
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).optional(),
  LOG_PRETTY: z.enum(["true", "false"]).optional(),

  // Rate limiting (Upstash Redis) — optional, falls back to in-memory passthrough
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().optional(),
});

function parseEnv() {
  const isProduction = process.env["NODE_ENV"] === "production";

  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
    NEXT_PUBLIC_APP_NAME: process.env["NEXT_PUBLIC_APP_NAME"],
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    NEXT_PUBLIC_POSTHOG_KEY: process.env["NEXT_PUBLIC_POSTHOG_KEY"],
    NEXT_PUBLIC_POSTHOG_HOST: process.env["NEXT_PUBLIC_POSTHOG_HOST"],
    NEXT_PUBLIC_SENTRY_DSN: process.env["NEXT_PUBLIC_SENTRY_DSN"],
  });

  if (!clientResult.success) {
    if (isProduction) {
      throw new Error(
        `Missing required client env vars:\n${clientResult.error.toString()}`
      );
    }
    // In dev, log a warning but don't crash so local dev works before Supabase is set up.
    // console.warn intentional here: logger isn't ready yet (it reads LOG_LEVEL from this file)
    console.warn("[env] Client env var validation failed (dev mode):\n", clientResult.error.toString());
  }

  const serverResult = serverSchema.safeParse(process.env);
  if (!serverResult.success) {
    if (isProduction) {
      throw new Error(
        `Missing required server env vars:\n${serverResult.error.toString()}`
      );
    }
    console.warn("[env] Server env var validation failed (dev mode):\n", serverResult.error.toString());
  }

  return {
    ...(clientResult.success ? clientResult.data : {}),
    ...(serverResult.success ? serverResult.data : {}),
  } as z.infer<typeof clientSchema> & z.infer<typeof serverSchema>;
}

export const env = parseEnv();
