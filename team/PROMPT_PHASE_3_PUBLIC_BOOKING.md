# Claude Code Prompt — Phase 3: Public Booking Flow

**Project:** Klyro
**Phase:** 3 — Public Booking Flow
**Branch base:** `development` (after Phase 2.5 PR merged)
**Your feature branch:** `feature/phase-3-public-booking`
**Parallel work:** A teammate is doing Phase 2.5 Block F (wizard polish) on `feature/phase-2.5-block-f-wizard-polish`. This prompt is designed to avoid conflicts.
**Spec:** `Klyro_Technical_PRD.md` v2.0 §4.4 (booking flow), §5.1 (schema), §7 Phase 3, §9 (API contracts)
**Workflow rules:** `CLAUDE_CODE_WORKFLOW.md`

---

## Why this phase exists

Phase 3 is the core loop of Klyro: a client opens a shared link, picks a slot, and books in under 60 seconds. Without this, the wizard you just finished produces no business value — there's no booking surface for the owner to share.

This phase introduces the first **public, unauthenticated** routes in Klyro. Phase 2.5's hardening (error model, rate limiting, structured logging, phone validation, country catalog) was built specifically to make this phase safe to ship.

---

## 🚀 PROMPT

Paste the block below into Claude Code from the `klyro/` repo root, **on a fresh branch off `development`**.

```
You are executing Phase 3 — Public Booking Flow — on a feature branch. Phases 0, 1, 2, and 2.5 are complete and merged to development. A teammate is doing Phase 2.5 Block F (wizard polish) in parallel on feature/phase-2.5-block-f-wizard-polish. Your work is designed to merge cleanly alongside theirs.

Workflow rules in CLAUDE_CODE_WORKFLOW.md apply.

CRITICAL RULES:
1. Klyro_Technical_PRD.md is the source of truth. If unclear, ASK before guessing.
2. Build block by block (A → F below). One commit per block. STOP and report after each.
3. Typecheck + lint + test must all pass before each commit.
4. Use existing deps only — no new dependencies unless explicitly approved.
5. Apply Klyro brand tokens — but this phase uses the LIGHT surface (--color-bg-light), not the dashboard's dark surface, per PRD §8.1 (booking page is the public face).
6. NEVER touch files outside the allowlist below. If you think you need to, STOP and ask.
7. Update STATUS.md, TASKS.md, DECISIONS.md per block.
8. NEVER push. Local commits only.

================================================================
BRANCH SETUP (do this BEFORE editing any code)
================================================================

  git fetch origin
  git checkout development
  git pull origin development
  git checkout -b feature/phase-3-public-booking

Confirm with `git status` that you're on the new branch and clean.

================================================================
CONFLICT-AVOIDANCE BOUNDARIES (read carefully)
================================================================

A teammate is doing Phase 2.5 Block F (wizard polish: launch loader + phone prefix) in parallel.
To merge cleanly, this phase follows strict file-scope rules:

ALLOWED to modify:
  src/i18n/locales/es.json                         (ONLY under namespace `booking.*` and `errors.booking.*`)
  src/i18n/locales/en.json                         (same namespaces)
  src/middleware.ts                                 (to allow public access to booking routes — see Block A)
  src/types/database.ts                             (regenerate if schema RPCs change; no manual edits)
  STATUS.md
  TASKS.md
  DECISIONS.md

ALLOWED to create (everything else is in fresh files/folders):
  src/app/[locale]/[bizSlug]/page.tsx
  src/app/[locale]/[bizSlug]/[branchSlug]/page.tsx
  src/app/[locale]/[bizSlug]/[branchSlug]/[staffSlug]/page.tsx
  src/app/[locale]/[bizSlug]/[branchSlug]/[staffSlug]/_components/*    (private components for booking only)
  src/app/api/booking/slots/route.ts
  src/app/api/booking/create/route.ts
  src/lib/booking/slots.ts                         (slot calculation engine)
  src/lib/booking/booking-code.ts                  (KLY-XXXX generator)
  src/lib/booking/queries.ts                       (Supabase reads for booking pages)
  src/lib/schemas/booking.ts                       (zod schemas for booking endpoints)
  src/lib/log/booking.ts                           (scoped logger for booking)
  tests/booking/**                                  (unit + integration tests)
  tests/e2e/booking.spec.ts                         (E2E happy path)
  supabase/migrations/0008_<name>.sql               (only if schema changes required — see Block B)

FORBIDDEN to touch (your teammate owns these in Block F):
  src/components/wizard/**                         (entire wizard tree)
  src/components/ui/LaunchLoader.tsx                (new, theirs)
  src/components/wizard/CountryPhoneInput.tsx       (new, theirs)
  src/app/[locale]/(setup)/**                      (wizard route)
  Any i18n keys under `wizard.*` namespace

ALLOWED to consume (read-only — do NOT edit):
  src/lib/validation/phone.ts                       (Phase 2.5 Block B — use it for client phone validation)
  src/lib/format/phone.ts                           (use formatPhoneE164 / formatPhoneDisplay)
  src/lib/format/currency.ts                        (use formatCurrency for service prices)
  src/lib/format/date.ts                            (use formatDate / formatTime)
  src/lib/i18n/countries.ts                         (use COUNTRIES for client phone validation)
  src/lib/errors/                                   (use ApiError + toErrorResponse — Phase 2.5 Block A)
  src/lib/rate-limit/                               (use the `booking` limiter — Phase 2.5 Block C)
  src/lib/log/                                      (use makeLogger and withRequestLogging — Phase 2.5 Block D)
  src/lib/verticals/registry.ts                     (use bookingPageHints for vertical-aware copy)

If you discover you need to extend something in the "consume" list, STOP. Tell me the gap.
Adding new files in `src/lib/booking/` or sibling files is fine; editing the existing helpers is not.

================================================================
PHASE 3 OVERVIEW (read before starting)
================================================================

Three public routes, two API endpoints, one slot engine, one booking code generator,
brand-consistent UI on the light surface. The flow:

  /[locale]/[bizSlug]                            → Business landing page (name, list of branches)
  /[locale]/[bizSlug]/[branchSlug]               → Branch page (services + staff list)
  /[locale]/[bizSlug]/[branchSlug]/[staffSlug]   → Booking page (calendar + slots + form)

  GET  /api/booking/slots?staffId=…&serviceId=…&date=YYYY-MM-DD
  POST /api/booking/create   { businessId, branchId, staffId, serviceId, startsAt, client: { fullName, whatsappNumber } }

Locked decisions (per founder, do not re-debate):
- Client WhatsApp is validated against the BUSINESS's country (not auto-detected from client phone).
  Pull `businesses.country` from DB; use it as the country arg to validatePhone.
- Booking page renders in the BUSINESS's `default_language`, not the URL locale, when they differ.
  (If owner created the business in es-MX, all clients see Spanish even if they hit /en/…)
- Slot duration = service.duration_minutes. Buffer between slots = vertical's `defaultBufferMinutes`
  from the registry. Both already exist; this phase only reads.
- Booking code format: KLY-XXXX where XXXX is 4 alphanumeric chars from a non-confusing alphabet
  (no 0/O/1/I/l). Stored on appointments. Generation is collision-checked with a single retry.
- The booking page uses the LIGHT surface tokens (--color-bg-light, --text-on-light) per PRD §8.1.
  This is intentional — the public face of Klyro is light; the owner dashboard is dark.

Out of scope for Phase 3 (do NOT build):
- Real-time slot updates (Phase 5).
- Email/SMS sending the confirmation (Phase 4).
- The KLY-XXXX code is GENERATED and DISPLAYED. Sending it via WhatsApp is Phase 4.
- Rescheduling / cancellation from the public side (Phase 3.x or later).
- Multi-service booking in one transaction (one service per booking in MVP).
- Authenticated client portal (post-MVP).

================================================================
BLOCK A — PUBLIC ROUTE ACCESS + ROUTING
================================================================

Goal: middleware allows unauthenticated access to /[locale]/[bizSlug]/** and /api/booking/**, but keeps everything else protected.

A1. Open src/middleware.ts and add the booking paths to the public allowlist. The current
    middleware (Phase 1) protects /dashboard and /setup. Add patterns:
      - /:locale/:bizSlug                                (one segment after locale, NOT 'setup' or 'dashboard')
      - /:locale/:bizSlug/:branchSlug
      - /:locale/:bizSlug/:branchSlug/:staffSlug
      - /api/booking/(.*)
    Use the existing matcher pattern in the middleware — do not rewrite the whole thing.

A2. Create scaffolding pages with placeholder content (so routes resolve):
    - /[locale]/[bizSlug]/page.tsx                     → renders <h1>{biz.name}</h1> + branch count
    - /[locale]/[bizSlug]/[branchSlug]/page.tsx        → renders <h1>{branch.name}</h1>
    - /[locale]/[bizSlug]/[branchSlug]/[staffSlug]/page.tsx → renders <h1>{staff.display_name}</h1>
    Each page does a server-side fetch from src/lib/booking/queries.ts (next step) and 404s if not found.

A3. Create src/lib/booking/queries.ts:
    - getBusinessBySlug(slug): Business | null
    - getBranchByBizAndSlug(bizId, branchSlug): Branch | null
    - getStaffByBranchAndSlug(branchId, staffSlug): Staff | null
    - getActiveServicesForStaff(staffId, branchId): Service[]
    All read via the anon Supabase client (RLS allows public read of non-deactivated rows per PRD §6.3 — verify the policies exist; if not, flag it and we'll add an RLS migration).

A4. Add the not-found UI for each level using the existing not-found.tsx from Block A (Phase 2.5).
    Public visitors must see a branded 404 with a useful message ("Este negocio no existe").

EXIT CRITERION BLOCK A:
  ✅ /es/<a-real-biz-slug> loads with the business name
  ✅ /es/<a-real-biz-slug>/<branch>/<staff> loads with placeholder content
  ✅ /es/this-does-not-exist returns the branded 404
  ✅ /dashboard still requires auth (regression check)
  ✅ Single commit: "feat(phase-3-block-a): public booking routes scaffolding"

STOP and report. Wait for my approval.

================================================================
BLOCK B — SLOT CALCULATION ENGINE
================================================================

Goal: a pure, well-tested function that, given a staff member, a service, a target date, and the current time, returns the available slots for that day.

B1. Create src/lib/booking/slots.ts:

    type Slot = { startsAt: string /* ISO */; endsAt: string /* ISO */ };

    type Inputs = {
      staffId: string;
      serviceId: string;
      branchId: string;
      date: string;                    // YYYY-MM-DD in business timezone
      now?: Date;                      // injectable for tests, defaults new Date()
    };

    export async function getAvailableSlots(inputs: Inputs): Promise<Slot[]>

    Algorithm:
    1. Load staff_availability for (staffId, branchId, day_of_week derived from date)
    2. Load existing appointments for (staffId, date range) where status in ('pending','confirmed')
    3. Load the service to get duration_minutes
    4. Load the business to get vertical, then registry's defaultBufferMinutes
    5. Build the candidate slot grid:
         - Start from staff_availability.start_time
         - Generate slots every (duration + buffer) minutes
         - Stop before staff_availability.end_time
    6. Filter out slots that overlap any existing appointment
    7. Filter out slots in the past (compare to `now`)
    8. Return ISO timestamps in UTC (the page formats per business timezone)

B2. Edge cases (cover in tests):
    - No availability on requested day → returns []
    - Service longer than the day's window → returns []
    - Existing appointment covers the entire window → returns []
    - Buffer pushes the last slot past end_time → that slot excluded
    - DST transitions in the business timezone → use date-fns-tz (already in stack if Phase 2.5 added it; if not, ASK before adding)

B3. Tests in tests/booking/slots.test.ts:
    - Happy path: HN barbershop Mon 9-18, 30-min cut, 0 appointments → expected slot count
    - With one existing appointment at 10:00 → that slot and any overlap excluded
    - Same-day request with `now` = 11:00 → all morning slots filtered out
    - Service 90min duration on a day with 60min window → []

B4. If during implementation you find that the schema is missing an index for the appointments
    range query (it has indexes on (business_id, starts_at) and (staff_id, starts_at) per PRD §5.1
    — verify), STOP and report. Adding indexes is OK but should be a deliberate migration.

EXIT CRITERION BLOCK B:
  ✅ getAvailableSlots returns expected results for the 4 test scenarios above
  ✅ All slot tests pass
  ✅ No DB schema changes (or if needed, a clean 0008 migration with note in DECISIONS.md)
  ✅ Single commit: "feat(phase-3-block-b): slot calculation engine"

STOP and report. Wait for my approval.

================================================================
BLOCK C — BOOKING API ENDPOINTS
================================================================

Goal: two API routes — slots (GET) and create (POST). Both use the rate limiter (Phase 2.5 Block C), structured logging (Block D), and ApiError (Block A).

C1. Create src/lib/schemas/booking.ts:
    - slotsQuerySchema: { staffId: uuid, serviceId: uuid, branchId: uuid, date: YYYY-MM-DD }
    - createBookingSchema:
        {
          businessId, branchId, staffId, serviceId,
          startsAt: ISO datetime,
          client: { fullName: string (2..120), whatsappNumber: string }
        }
      Note: whatsappNumber is validated against the business's country (loaded server-side, not trusted from request).

C2. Create src/app/api/booking/slots/route.ts (GET):
    - Wrap handler with `withRequestLogging('booking.slots', handler)` from Block D
    - Apply `booking` rate limiter (Block C) keyed by IP + businessId (lookup business from slugs if needed)
    - Parse query with slotsQuerySchema
    - Call getAvailableSlots from Block B
    - Return { slots: Slot[] }
    - All errors via toErrorResponse

C3. Create src/app/api/booking/create/route.ts (POST):
    - Wrap with withRequestLogging('booking.create', handler)
    - Apply `booking` rate limiter keyed by IP + businessId (stricter than slots)
    - Parse body with createBookingSchema
    - Load business → use business.country to validate client.whatsappNumber via validatePhone
    - Re-check slot availability (race condition guard): call getAvailableSlots and confirm the requested startsAt is still in the list
    - Upsert clients row (match by whatsappNumber within business_id; if exists, link; if not, create)
    - Insert appointments row with status='confirmed' and generated booking_code
    - Return { appointmentId, bookingCode, status: 'confirmed' }
    - On slot-taken race: return ApiError.conflict('SLOT_TAKEN') with i18n key

C4. Booking code generator in src/lib/booking/booking-code.ts:
    - generateBookingCode(): string
    - 4 chars from 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' (no 0/O/1/I/l)
    - Format 'KLY-XXXX'
    - Caller is responsible for uniqueness check; the API route retries once on collision.

C5. Schema check: does the appointments table have a `booking_code` column? Per PRD §5.1 it does
    not appear in the snippet. If it's missing, add migration 0008_booking_code.sql:
      ALTER TABLE appointments ADD COLUMN booking_code text;
      CREATE UNIQUE INDEX idx_appointments_booking_code ON appointments (booking_code) WHERE booking_code IS NOT NULL;
    Regenerate src/types/database.ts. Add an ADR explaining the addition.

C6. Tests in tests/booking/create.test.ts:
    - Happy path: valid body returns 200 with appointmentId + KLY-XXXX
    - Phone with wrong country → 400 with VALIDATION_FAILED + fieldErrors.client.whatsappNumber
    - Slot taken (simulate by inserting a conflicting appointment before the call) → 409 with SLOT_TAKEN
    - Booking code collision (mock generateBookingCode to return same value twice) → still succeeds via retry
    - Rate limit exceeded → 429 with RATE_LIMITED

EXIT CRITERION BLOCK C:
  ✅ Both endpoints implemented, validated, rate-limited, logged
  ✅ Booking code unique constraint enforced (DB level)
  ✅ All 5 create tests pass; slots endpoint smoke-tested manually
  ✅ Migration 0008 applied (if needed)
  ✅ Single commit: "feat(phase-3-block-c): booking API endpoints"

STOP and report. Wait for my approval.

================================================================
BLOCK D — PUBLIC UI: BUSINESS + BRANCH + BOOKING PAGES
================================================================

Goal: light-surface, mobile-first, brand-consistent pages that turn the API into a usable flow.

D1. /[locale]/[bizSlug]/page.tsx — Business landing:
    - Header: business name + logo (if uploaded; falls back to <Logo variant="mark" />)
    - Hint subtitle from vertical registry (bookingPageHints.serviceNoun in business language)
    - List of active branches: name, address, "Ver disponibilidad" CTA per branch
    - Vertical-aware H1 copy: registry → use serviceNoun ("Reserva tu cita", "Agenda tu sesión", etc.)
    - If only one branch: auto-redirect to /[bizSlug]/[branchSlug]

D2. /[locale]/[bizSlug]/[branchSlug]/page.tsx — Branch page:
    - Branch header (name, address, hours summary today)
    - Tabs/sections: Services | Staff
    - Service cards: name, duration, price (formatCurrency from Phase 2.5)
    - Staff cards: display_name, avatar, services offered
    - "Reservar con X" CTA per staff → /[bizSlug]/[branchSlug]/[staffSlug]
    - Vertical-aware staffNoun for headings

D3. /[locale]/[bizSlug]/[branchSlug]/[staffSlug]/page.tsx — Booking page:
    - Step 1 (visual): pick a service from the services this staff offers
    - Step 2: pick a date — calendar widget showing the next 28 days
    - Step 3: pick a slot — calls GET /api/booking/slots on date selection; shows slot grid
    - Step 4: client form — fullName + whatsappNumber (use the same CountryPhoneInput approach
      conceptually, BUT YOUR TEAMMATE OWNS THAT COMPONENT — create a parallel local version in
      this route's _components folder, OR if they've already pushed Block F, import it. Coordinate
      with the founder if the timing is tight; default plan is to ship a local copy in
      _components/BookingPhoneInput.tsx that you'll later delete in a cleanup PR.)
    - Step 5: confirmation screen with KLY-XXXX, summary, "Guardar este código" hint

D4. Brand:
    - Use --color-bg-light + --color-text-on-light surface tokens
    - Violet (--color-violet) CTAs, success states use --color-success
    - Inter font (already loaded)
    - Mobile-first: min-w 320px target, single-column layout

D5. i18n keys (es + en) under `booking.*` ONLY:
    - booking.business.tagline
    - booking.branch.servicesLabel / staffLabel
    - booking.flow.pickService / pickDate / pickSlot / yourDetails
    - booking.form.name / whatsapp / submit / submitting
    - booking.success.title / code.label / saveHint
    - booking.errors.* (slotTaken, networkError, etc. — keep distinct from top-level errors.*)

D6. Error & loading states:
    - Skeleton placeholders during fetch
    - "No hay horarios disponibles este día" empty state
    - Errors shown inline near the affected step using ApiError codes from the API

D7. Tests:
    - Unit: vertical-aware copy resolves correctly for barbershop and fitness
    - Component: booking form validates name + phone; submit calls POST /api/booking/create
    - Snapshot or visual: not required for MVP, skip

EXIT CRITERION BLOCK D:
  ✅ All 3 public pages render end-to-end with real data from a seeded business
  ✅ Light-surface tokens applied throughout
  ✅ Mobile layout works at 375px width
  ✅ Vertical-aware copy renders for barbershop AND at least one non-wedge vertical
  ✅ Single commit: "feat(phase-3-block-d): public booking UI"

STOP and report. Wait for my approval.

================================================================
BLOCK E — E2E + VERTICAL COVERAGE
================================================================

Goal: Playwright tests that exercise the full client booking journey end-to-end. PRD §11 requires vertical coverage — barbershop + fitness minimum.

E1. tests/e2e/booking.spec.ts:
    - Test: "barbershop client books in under 60 seconds"
        Setup: seed a barbershop business with branch, services, staff, availability for tomorrow
        Steps: visit /[locale]/[bizSlug] → pick branch → pick staff → pick service → pick date → pick slot → enter name + WhatsApp → submit → expect KLY-XXXX screen
        Assertions: appointment row exists in DB, booking_code matches displayed code, no console errors

    - Test: "fitness client books a session"
        Same as above with fitness vertical; assert that "sesión" (not "cita") appears in the copy.

    - Test: "slot taken during booking → user sees error"
        Setup: seed two clients, race condition test where slot is claimed between view and submit.
        Assert: 409 SLOT_TAKEN, friendly inline message, button re-enabled.

E2. Test helpers in tests/booking/helpers/:
    - seedBusiness(vertical: VerticalKey): returns { biz, branch, staff, services }
    - cleanupBusiness(bizId): teardown after each test
    Reuse the admin Supabase client pattern from Phase 2 (src/lib/supabase/admin.ts).

E3. CI: add the e2e suite to the existing pnpm test:e2e matrix from Phase 2.5 Block E.

E4. Manual verification script (run after commit, report):
    1. /es/<biz-slug> renders the business landing
    2. /es/<biz-slug>/<branch-slug>/<staff-slug> shows slots for tomorrow
    3. Submit booking with valid HN WhatsApp → success screen with KLY code
    4. Refresh and re-submit same slot → 409 SLOT_TAKEN inline error
    5. Try with wrong-country phone → 400 with field error on whatsappNumber
    6. Open /en/<biz-slug>: copy is in English (assuming biz default_language='es', this should
       STILL render in Spanish — confirm the locked decision is implemented)
    7. Mobile viewport (375px): all CTAs reachable, no horizontal scroll

EXIT CRITERION BLOCK E (and PHASE 3):
  ✅ All E2E tests pass locally and in CI
  ✅ Manual verification 7 steps all pass
  ✅ Phase 3 marked ✅ in STATUS.md and TASKS.md
  ✅ DECISIONS.md updated (ADRs for: booking-code format, slot race-condition handling, business-language-overrides-URL-locale)
  ✅ Single commit: "feat(phase-3-block-e): e2e + vertical coverage"
  ✅ git tag phase-3-done

================================================================
REPORTING TEMPLATE (use after each block)
================================================================

## Phase 3 — Block <X> — Report

**Status:** ✅ Done / 🟡 Partial / 🔴 Blocked

**Branch:** feature/phase-3-public-booking (based on development @ <sha>)

**Files added/changed:**
- <list>

**Decisions added to DECISIONS.md:**
- <ADR-XXX summary>

**Tests:**
- pnpm typecheck: <status>
- pnpm lint: <status>
- pnpm test: <pass/fail counts>
- pnpm test:e2e (block E only): <status>

**Manual verification (where applicable):**
- <results>

**Conflict avoidance check:**
- Files modified outside allowlist? (must be NO)
- i18n keys added only under `booking.*` namespace? (must be YES)
- Wizard files (src/components/wizard/**) untouched? (must be YES)

**Ready for next block?** Yes / No

================================================================
START NOW
================================================================
Read Klyro_Technical_PRD.md (§4.4 booking flow, §5.1 schema, §7 Phase 3 plan, §9 API contracts, §8.1 light-surface tokens), STATUS.md, TASKS.md, DECISIONS.md. Summarize Phase 3 in 5–8 bullets including:
- The 3 public routes and 2 API endpoints
- The light-surface theme requirement
- The conflict-avoidance boundaries
- The 3 locked decisions (client country = business country, language follows business not URL, booking code format)

Then begin with the branch setup, then BLOCK A.
```

---

## 📋 Notes for your teammate

1. **Branch off latest `development`.** Block F may merge before or after — either way, base off the freshest `development` SHA at the time you start.
2. **The CountryPhoneInput coordination point** is in Block D. If Block F has merged when you reach Block D, import their `CountryPhoneInput`. If not, ship a local `BookingPhoneInput` in `_components/` and clean it up in a follow-up PR. Don't wait blocked on them.
3. **Light surface, not dark.** The booking page is the public face of Klyro — it must match the marketing site's surface treatment. The PRD §8.1 light tokens are real, not optional.
4. **Don't preempt Phase 4.** Booking code generation is here; sending the confirmation message via WhatsApp is Phase 4. The success screen displays the code; that's it.
5. **One commit per block, stop-and-report after each.** Even if a block goes fast, do the report. The merge conflict surface stays small as long as we keep blocks atomic.
