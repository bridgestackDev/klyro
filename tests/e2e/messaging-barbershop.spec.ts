/**
 * E2E: Automated messaging — barbershop vertical
 *
 * Verifies that completing a booking via the public booking flow causes two
 * `messages` rows to be created in the DB: a confirmation (scheduled_at ≈ now)
 * and a 24h reminder (scheduled_at = starts_at - 24h).
 *
 * This test does NOT dispatch messages (that requires the Edge Function +
 * real provider credentials). It validates the scheduling layer only.
 *
 * Constitution requirement: E2E suite must cover ≥ 2 distinct verticals.
 * This file covers: barbershop.  See messaging-fitness.spec.ts for fitness.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  seedBusiness,
  cleanupBusiness,
  type SeededBusiness,
} from "../booking/helpers/seed";

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0]!;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

test("barbershop booking creates confirmation + reminder message rows", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    // ── Complete the booking flow ──────────────────────────────────────────
    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    await page.getByRole("button", { name: serviceName }).click();
    await page.getByRole("button", { name: tomorrow() }).click();
    await expect(
      page.getByRole("list", { name: /elige un horario/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    await page.locator("#booking-name").fill("Carlos Ramírez");
    await page.locator("#booking-phone").fill("99990001");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i }),
    ).toBeVisible({ timeout: 15_000 });

    const codeEl = page.getByText(/^KLY-[A-Z0-9]{4}$/);
    await expect(codeEl).toBeVisible();
    const bookingCode = await codeEl.textContent();

    // ── Verify DB state ────────────────────────────────────────────────────
    const admin = getAdminClient();

    // 1. Find the appointment
    const { data: appt } = await admin
      .from("appointments")
      .select("id, starts_at, status")
      .eq("booking_code", bookingCode!)
      .single();

    expect(appt).toBeDefined();
    expect(appt!.status).toMatch(/confirmed|pending/);

    // 2. Give the fire-and-forget scheduleMessages() a moment to complete
    await page.waitForTimeout(2000);

    // 3. Verify message rows
    const { data: messages } = await admin
      .from("messages")
      .select("type, status, scheduled_at, channel")
      .eq("appointment_id", appt!.id)
      .order("scheduled_at", { ascending: true });

    expect(messages).toBeDefined();
    expect(messages!.length).toBeGreaterThanOrEqual(1);

    // Confirmation message must exist
    const confirmation = messages!.find((m) => m.type === "confirmation");
    expect(confirmation).toBeDefined();
    expect(confirmation!.status).toBe("pending");
    expect(["whatsapp", "sms", "email"]).toContain(confirmation!.channel);

    // Reminder must exist (starts_at is tomorrow so well over 24h away)
    const reminder = messages!.find((m) => m.type === "reminder_24h");
    expect(reminder).toBeDefined();
    expect(reminder!.status).toBe("pending");

    // Reminder must be scheduled ~24h before appointment
    const reminderMs = new Date(reminder!.scheduled_at!).getTime();
    const startsAtMs = new Date(appt!.starts_at).getTime();
    const diffHours = (startsAtMs - reminderMs) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

test("barbershop cancel via token voids reminder and schedules cancellation message", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    // Complete booking
    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);
    await page.getByRole("button", { name: serviceName }).click();
    await page.getByRole("button", { name: tomorrow() }).click();
    await expect(
      page.getByRole("list", { name: /elige un horario/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    await page.locator("#booking-name").fill("María Gómez");
    await page.locator("#booking-phone").fill("99990002");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();
    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i }),
    ).toBeVisible({ timeout: 15_000 });

    const codeEl = page.getByText(/^KLY-[A-Z0-9]{4}$/);
    const bookingCode = await codeEl.textContent();

    await page.waitForTimeout(2000);

    const admin = getAdminClient();

    const { data: appt } = await admin
      .from("appointments")
      .select("id, cancel_token")
      .eq("booking_code", bookingCode!)
      .single();

    // cancel_token column present only after migration 0010 is applied.
    // Skip cancellation assertion if column is absent (pre-migration state).
    if (!appt?.cancel_token) {
      test.skip();
      return;
    }

    // Cancel via the API endpoint
    const cancelRes = await page.request.post(
      `/api/appointments/${appt.id}/cancel`,
      {
        data: { token: appt.cancel_token },
        headers: { "content-type": "application/json" },
      },
    );
    expect(cancelRes.status()).toBe(200);

    // Verify reminder was voided and cancellation message created
    const { data: messages } = await admin
      .from("messages")
      .select("type, status")
      .eq("appointment_id", appt.id);

    const reminder = messages?.find((m) => m.type === "reminder_24h");
    expect(reminder?.status).toBe("cancelled");

    const cancellation = messages?.find((m) => m.type === "cancellation");
    expect(cancellation?.status).toBe("pending");
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});
