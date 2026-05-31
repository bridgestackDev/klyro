import { test, expect } from "@playwright/test";
import {
  seedBusiness,
  cleanupBusiness,
  type SeededBusiness,
} from "../booking/helpers/seed";

// Tomorrow's date in YYYY-MM-DD (the DateCell aria-label format)
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0]!;
}

// ── Test 1: barbershop client books in under 60 seconds ──────────────────────

test("barbershop client books appointment", async ({ page }) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    // Step 1 — pick service
    await page.getByRole("button", { name: serviceName }).click();

    // Step 2 — pick tomorrow
    const tomorrowStr = tomorrow();
    await page.getByRole("button", { name: tomorrowStr }).click();

    // Step 3 — wait for slots and pick the first one
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    // Step 4 — fill form
    await page.locator("#booking-name").fill("Ana García");
    await page.locator("#booking-phone").fill("99990000");

    // Submit
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    // Step 5 — confirmation
    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i })
    ).toBeVisible({ timeout: 15_000 });

    // Booking code is displayed
    const codeEl = page.getByText(/^KLY-[A-Z0-9]{4}$/);
    await expect(codeEl).toBeVisible();

    // Verify appointment exists in DB
    const code = await codeEl.textContent();
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: appt } = await admin
      .from("appointments")
      .select("id, booking_code")
      .eq("booking_code", code!)
      .single();

    expect(appt?.booking_code).toBe(code);
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

// ── Test 2: fitness client books a session (vertical-aware copy check) ───────

test("fitness client sees vertical copy and books session", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("fitness");
    const { bizSlug, branchSlug, staffSlug } = seed;

    // Branch page: fitness uses staffNoun "entrenador"
    await page.goto(`/es/${bizSlug}/${branchSlug}`);
    await expect(page.getByText(/entrenador/i)).toBeVisible();

    // Navigate to booking page
    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    // Service name for fitness vertical
    await page.getByRole("button", { name: /sesión de entrenamiento/i }).click();

    // Pick tomorrow
    const tomorrowStr = tomorrow();
    await page.getByRole("button", { name: tomorrowStr }).click();

    // Wait for slots and pick first one
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    // Fill form and submit
    await page.locator("#booking-name").fill("Luis Pérez");
    await page.locator("#booking-phone").fill("88880000");
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    // Confirmation shows
    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^KLY-[A-Z0-9]{4}$/)).toBeVisible();
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

// ── Test 3: email-only booking → confirmation screen appears ─────────────────

test("client books with email only (no WhatsApp)", async ({ page }) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    // Step 1 — pick service
    await page.getByRole("button", { name: serviceName }).click();

    // Step 2 — pick tomorrow
    const tomorrowStr = tomorrow();
    await page.getByRole("button", { name: tomorrowStr }).click();

    // Step 3 — wait for slots and pick the first one
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    // Step 4 — fill only email (leave phone empty)
    await page.locator("#booking-name").fill("María Email");
    await page.locator("#booking-email").fill("maria@example.com");

    // Submit
    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    // Step 5 — confirmation
    await expect(
      page.getByRole("heading", { name: /reserva confirmada/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^KLY-[A-Z0-9]{4}$/)).toBeVisible();
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

// ── Test 4: slot taken during booking → user sees inline error ───────────────

test("slot taken shows inline error and re-enables slot picker", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    // Navigate through steps 1–4
    await page.getByRole("button", { name: serviceName }).click();
    await page.getByRole("button", { name: tomorrow() }).click();
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    await page.locator("#booking-name").fill("Pedro Test");
    await page.locator("#booking-phone").fill("77770000");

    // Intercept the submit request and return 409 SLOT_TAKEN
    await page.route("**/api/booking/create", (route) => {
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SLOT_TAKEN",
            message:
              "Este horario ya fue reservado. Por favor elige otro.",
          },
        }),
      });
    });

    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    // Should be back on step 3 with the slot-taken alert visible
    await expect(page.getByRole("alert")).toContainText(
      /ya fue reservado/i,
      { timeout: 5_000 }
    );

    // Slot grid should be visible again (user can pick a new slot)
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});

// ── Test 5: submitting with neither phone nor email shows "at least one" error

test("submitting with no contact info shows at-least-one-contact error", async ({
  page,
}) => {
  let seed: SeededBusiness | null = null;

  try {
    seed = await seedBusiness("barbershop");
    const { bizSlug, branchSlug, staffSlug, serviceName } = seed;

    await page.goto(`/es/${bizSlug}/${branchSlug}/${staffSlug}`);

    // Navigate to step 4
    await page.getByRole("button", { name: serviceName }).click();
    await page.getByRole("button", { name: tomorrow() }).click();
    await expect(
      page.getByRole("list", { name: /elige un horario/i })
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByRole("list", { name: /elige un horario/i })
      .getByRole("listitem")
      .first()
      .getByRole("button")
      .click();

    // Fill only name, leave both phone and email empty
    await page.locator("#booking-name").fill("Sin Contacto");

    await page.getByRole("button", { name: /confirmar reserva/i }).click();

    // Should show the "at least one" error and NOT navigate to confirmation
    await expect(page.getByRole("alert")).toContainText(
      /whatsapp.*correo|correo.*whatsapp|necesitamos/i,
      { timeout: 5_000 }
    );
    // Still on step 4 (no booking code visible)
    await expect(page.getByRole("heading", { name: /reserva confirmada/i })).not.toBeVisible();
  } finally {
    if (seed) await cleanupBusiness(seed.bizId);
  }
});
