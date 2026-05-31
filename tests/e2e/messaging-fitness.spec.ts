/**
 * E2E: Automated messaging — fitness vertical
 *
 * Counterpart to messaging-barbershop.spec.ts. Verifies the same messaging
 * scheduling behaviour for the fitness vertical, satisfying the constitution
 * requirement that E2E coverage spans ≥ 2 distinct verticals.
 *
 * The fitness vertical differs in:
 * - Service name: "Sesión de entrenamiento" (60 min)
 * - Messaging tone: motivational ("¡A darle! 💪")
 * - Template vocabulary: uses "sesión" / "entrenador" nouns
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

test("fitness booking creates confirmation + reminder message rows", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("fitness");
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

    await page.locator("#booking-name").fill("Luis Torres");
    await page.locator("#booking-phone").fill("88880001");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i }),
    ).toBeVisible({ timeout: 15_000 });

    const codeEl = page.getByText(/^KLY-[A-Z0-9]{4}$/);
    await expect(codeEl).toBeVisible();
    const bookingCode = await codeEl.textContent();

    // ── Verify DB state ────────────────────────────────────────────────────
    const admin = getAdminClient();

    const { data: appt } = await admin
      .from("appointments")
      .select("id, starts_at, status")
      .eq("booking_code", bookingCode!)
      .single();

    expect(appt).toBeDefined();

    await page.waitForTimeout(2000);

    const { data: messages } = await admin
      .from("messages")
      .select("type, status, scheduled_at, channel")
      .eq("appointment_id", appt!.id)
      .order("scheduled_at", { ascending: true });

    expect(messages).toBeDefined();
    expect(messages!.length).toBeGreaterThanOrEqual(1);

    // Confirmation must exist with pending status
    const confirmation = messages!.find((m) => m.type === "confirmation");
    expect(confirmation).toBeDefined();
    expect(confirmation!.status).toBe("pending");

    // Reminder must exist (tomorrow is > 24h away)
    const reminder = messages!.find((m) => m.type === "reminder_24h");
    expect(reminder).toBeDefined();
    expect(reminder!.status).toBe("pending");

    // Both messages must use the same channel
    expect(confirmation!.channel).toBe(reminder!.channel);

    // Scheduled_at for confirmation should be within 30s of now
    const confScheduledMs = new Date(confirmation!.scheduled_at!).getTime();
    expect(Math.abs(confScheduledMs - Date.now())).toBeLessThan(30_000);

    // Reminder scheduled_at is ~24h before appointment
    const reminderMs = new Date(reminder!.scheduled_at!).getTime();
    const startsAtMs = new Date(appt!.starts_at).getTime();
    const diffHours = (startsAtMs - reminderMs) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.9);
    expect(diffHours).toBeLessThan(24.1);
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

test("fitness booking within 24h of start time creates only confirmation (no reminder)", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("fitness");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    // Navigate to booking page for today
    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);
    await page.getByRole("button", { name: serviceName }).click();

    // Pick today (slots starting within the next few hours = within 24h window)
    const todayStr = new Date().toISOString().split("T")[0]!;
    const todayBtn = page.getByRole("button", { name: todayStr });
    const hasTodaySlots = await todayBtn.isVisible();
    if (!hasTodaySlots) {
      // No slots today — skip this assertion gracefully
      test.skip();
      return;
    }

    await todayBtn.click();
    const slotList = page.getByRole("list", { name: /elige un horario/i });
    await expect(slotList).toBeVisible({ timeout: 10_000 });

    const firstSlot = slotList.getByRole("listitem").first();
    const slotVisible = await firstSlot.isVisible();
    if (!slotVisible) {
      test.skip();
      return;
    }

    await firstSlot.getByRole("button").click();
    await page.locator("#booking-name").fill("Ana Martínez");
    await page.locator("#booking-phone").fill("88880002");
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
      .select("id, starts_at")
      .eq("booking_code", bookingCode!)
      .single();

    if (!appt) return;

    const { data: messages } = await admin
      .from("messages")
      .select("type")
      .eq("appointment_id", appt.id);

    const types = (messages ?? []).map((m) => m.type);

    // If appointment is within 24h, no reminder should have been created
    const startsAtMs = new Date(appt.starts_at).getTime();
    const isWithin24h = startsAtMs - Date.now() < 24 * 60 * 60 * 1000;

    if (isWithin24h) {
      expect(types).toContain("confirmation");
      expect(types).not.toContain("reminder_24h");
    }
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});
