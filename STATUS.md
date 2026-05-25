# Klyro — Build Status

**Last updated:** 2026-05-25
**Active phase:** Phase 4 — Messaging Engine (next) | Phase 2.5 Block E (wizard E2E) still pending

---

## Phase Progress

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation | ✅ Done | All 12 tables, RLS, types, brand, CI |
| 1 | Auth & Onboarding Shell | ✅ Done | Magic link confirmed working end-to-end |
| 2 | Setup Wizard | ✅ Done | 9-step wizard, all DB writes, admin client RLS fix |
| 2.5 | Hardening & Localization | 🟡 In progress | Blocks A–D+F done; Block E pending |
| 2.6 | Business & Staff Media | ✅ Done | All blocks shipped; full team management in Phase 5 |
| LP | Landing Page (parallel) | ✅ Done | `/[locale]` — 4 sections, fully static, dark surface |
| 3 | Public Booking Flow | ✅ Done | All blocks A–E complete |
| 4 | Messaging Engine | ⬜ Not started | WhatsApp + email templates |
| 5 | Owner Dashboard | ⬜ Not started | Full operational view |
| 6 | Staff Dashboard | ⬜ Not started | RLS-scoped own-day view |
| 7 | Polish & QA | ⬜ Not started | WCAG AA, Lighthouse >90, brand pass |
| 8 | Closed Beta | ⬜ Not started | 10 pioneer businesses, klyro.app |

---

## Phase 0 — Foundation ✅

**Exit criteria met:**
- Next.js 16 + Tailwind v4 + TypeScript strict — 0 errors
- Klyro brand tokens (violet `#6D64FB` / navy `#14143A`) in `globals.css`
- `<Logo />` component — production PNG lockup (`public/klyro_logo_w.png`) + SVG placeholders for mark/wordmark
- shadcn/ui primitives wired to Klyro tokens
- Supabase project connected (`ouexfehqxpgewzgytjgc`)
- 12-table schema applied with full RLS policies
- 84 message templates seeded (7 verticals × 2 channels × 2 langs × 3 types)
- pg_cron job for reminder dispatch (every 5 min)
- Vertical registry — all 8 profiles typed and exported
- Zod-validated env vars (client + server split)
- next-intl i18n — Spanish default, English secondary
- Favicon + app icons from cat mark
- Sentry + PostHog + Vercel Analytics wired (no-op in dev)
- CI workflow (typecheck + lint + test on every PR) — pnpm build approvals committed
- Supabase agent skills installed
- `next-best-practices` + `ui-ux-pro-max` skills installed

---

## Phase 1 — Auth & Onboarding Shell ✅

**Smoke test results:**
- [x] `pnpm dev` starts without errors
- [x] `http://localhost:3000/es/login` renders login page with brand
- [x] Magic link email sends and redirects to `/es/dashboard` — confirmed working
- [x] Dashboard shows setup banner
- [x] Visiting `/es/dashboard` logged out → redirects to `/es/login`
- [ ] Google OAuth — blocked pending credentials (see below)

**Bugs fixed during smoke test:**
- Auth trigger used `app_metadata` (wrong); corrected to `raw_app_meta_data` — fix applied to live DB + migration file
- Callback URL was `/auth/callback`; route lives at `/{locale}/callback` (route group `(auth)` is URL-invisible) — fixed in `auth.ts`
- Root layout missing `<html>`/`<body>` tags required by Next.js 16 — moved to `app/layout.tsx` using `getLocale()`
- Callback route now handles Supabase `?error=` redirects (expired/invalid links) gracefully
- Dev server OOM crash under Node 24 (not LTS) — heap capped at 4 GB; use `nvm use 22`
- CI: pnpm version conflict between workflow `version: 11` and `packageManager` field — removed explicit version
- CI: `ERR_PNPM_IGNORED_BUILDS` — ran `pnpm approve-builds --all`, committed `pnpm-workspace.yaml`

**Manual setup completed:**
- [x] `http://localhost:3000/callback` added to Supabase → Auth → Redirect URLs
- [x] `SUPABASE_SERVICE_ROLE_KEY` added to `klyro/.env.local`
- [x] Custom SMTP (Resend) configured in Supabase → Auth → SMTP Settings *(required to avoid free-tier rate limits)*
- [x] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` configured for Google OAuth

---

## Phase 2 — Setup Wizard ✅

**Architecture:** 9-step wizard at `/[locale]/setup` — dedicated full-screen route (no sidebar) with modal-card UI centered on a dark gradient background. Framer Motion step transitions. State persisted to `localStorage` (`klyro_wizard_v1`) and incrementally saved to Supabase at each step.

**Steps implemented:**
1. Vertical selection — 8-card grid, reads from registry
2. Business name + slug — auto-generated from name, editable
3. Branch info — name, address, city, timezone, phone
4. Services — pre-seeded from vertical registry, add/remove/edit
5. Staff (owner) — display name + URL slug, pre-filled from auth
6. Availability — weekly schedule toggle per day, time selects
7. Messaging channel — WhatsApp (with number) or Email
8. Booking link preview — shows full URL, copy-to-clipboard
9. Confirmation — summary table + "Lanzar mi negocio" → sets `onboarding_completed = true`

**Key files:**
- `src/lib/schemas/wizard.ts` — Zod schemas for all 9 steps
- `src/lib/actions/wizard.ts` — Server Actions, one per step
- `src/lib/supabase/admin.ts` — Service role client (bypasses RLS for wizard writes)
- `src/components/wizard/` — `SetupWizard`, `WizardShell`, `WizardContext`, 9 step components
- `src/app/[locale]/(setup)/setup/page.tsx` — Wizard page
- `src/i18n/locales/es.json` + `en.json` — Full wizard copy (ES + EN)

**Bugs fixed during build:**
- `businesses` INSERT blocked by RLS: `USING (id = get_my_business_id())` returns `NULL` for new users → switched all wizard DB writes to service role admin client after session verification
- `slugHint` i18n string used `{curly}` syntax → next-intl parsed as interpolation variables → changed to plain strings

**Design decisions:**
- Separate route (`/[locale]/setup`) chosen over modal-on-dashboard: deep-linkable, full focus, standard SaaS pattern (Vercel/Linear/Notion), simpler layout code
- No auto-redirect wizard guard in dashboard layout — setup banner on dashboard is the entry point
- Wizard "×" close button returns to dashboard; progress survives in localStorage, so re-entering `/setup` resumes from the last step

**Exit criteria met:**
- [x] Any vertical owner can complete wizard end-to-end
- [x] DB shows fully configured business after step 9: `businesses`, `branches`, `services`, `branch_services`, `staff`, `staff_branches`, `staff_availability` populated; `onboarding_completed = true`
- [x] `pnpm typecheck` — 0 errors
- [x] `pnpm lint` — 0 warnings
- [x] `pnpm test` — 8/8 passing

---

## Phase 2.5 — Hardening & Localization 🟡

**Block A — Error Model & Global Handler** ✅ Done

Files added:
- `src/lib/errors/api-error.ts` — `ApiError` class + `ERROR_CODES` enum
- `src/lib/errors/to-response.ts` — `toErrorResponse()` for route handlers
- `src/lib/errors/index.ts` — barrel export
- `src/app/[locale]/error.tsx` — branded error boundary ("use client")
- `src/app/[locale]/not-found.tsx` — branded 404 page

Files changed:
- `src/lib/actions/wizard.ts` — all 6 actions wrapped in try/catch; use `ApiError.*` internally
- `src/components/wizard/SetupWizard.tsx` — `resolveError` extended to handle new codes
- `src/i18n/locales/es.json` + `en.json` — added FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, RATE_LIMITED, INTERNAL, BAD_REQUEST, CONFLICT codes + `boundary.*` + `notFound.*` sections
- `DECISIONS.md` — ADR-001, ADR-002, ADR-003

Tests: 53/53 passing (41 existing + 9 ApiError + 13 toErrorResponse)

**Block B — Validation + Country Catalog + Formatters** ✅ Done

Files added:
- `src/lib/validation/phone.ts` — validatePhone, normalizePhone, isValidWhatsAppNumber
- `src/lib/validation/slug.ts` — SLUG_REGEX, slugify, isValidSlug (consolidated from inline)
- `src/lib/validation/index.ts` — barrel
- `src/lib/i18n/countries.ts` — COUNTRIES catalog (HN + 6 LATAM + US), getCountry, DEFAULT_COUNTRY
- `src/lib/format/currency.ts` — formatCurrency via Intl.NumberFormat
- `src/lib/format/date.ts` — formatDate, formatTime, formatDateTime, formatRelative (date-fns)
- `src/lib/format/phone.ts` — formatPhoneE164, formatPhoneDisplay
- `src/lib/format/index.ts` — barrel

Files changed:
- `Step2Business.tsx` — uses `slugify` from validation lib (replaced inline function)
- `Step3Branch.tsx` — phone field validated on blur via `validatePhone`
- `Step4Services.tsx` — price shows formatted currency hint below input
- `Step7Messaging.tsx` — WhatsApp field validated via `isValidWhatsAppNumber`, stores E.164 on blur
- `Step9Confirm.tsx` — services row shows price range via `formatCurrency`; WhatsApp shows `formatPhoneDisplay`
- `wizard.ts` (server action) — branch slug generation uses `slugify`
- `es.json` + `en.json` — added phoneInvalid + whatsappInvalid keys

Tests: 83/83 passing

**Block B.1 — Country Selection in Wizard** ✅ Done

Files added:
- `src/lib/i18n/detect-country.ts` — `detectCountryFromLocale(locale)` helper
- `src/lib/i18n/__tests__/detect-country.test.ts` — 6 unit tests

Files changed:
- `src/lib/schemas/wizard.ts` — `step3Schema` gains `country` enum field (COUNTRIES keys, default HN)
- `src/components/wizard/types.ts` — `defaultWizardData.step3.country` initialized to `DEFAULT_COUNTRY`
- `src/lib/actions/wizard.ts` — `saveBranchStep` persists `country` to `branches`; UPDATEs `businesses.country` + `businesses.default_currency` in the same action
- `src/components/wizard/steps/Step3Branch.tsx` — Country select (before city), timezone autosuggest on country change, phone validation uses selected country
- `src/components/wizard/WizardContext.tsx` — `WizardProvider` accepts `locale` prop; seeds `step3.country` from detected locale on fresh starts and patches missing country on localStorage restore
- `src/components/wizard/SetupWizard.tsx` — passes `locale` to `WizardProvider`
- `src/i18n/locales/es.json` + `en.json` — added `wizard.steps.branch.country.{label, help}`
- `DECISIONS.md` — ADR-004 + ADR-005

Tests: 89/89 passing

**Block C — Rate Limiting Infrastructure** ✅ Done

Files added:
- `src/lib/rate-limit/client.ts` — `createLimiter()` with Upstash Redis backend + `PassthroughLimiter` fallback
- `src/lib/rate-limit/limiters.ts` — lazy singletons: `getSlugCheckLimiter` (30/60s), `getBookingLimiter` (10/60s), `getAuthLimiter` (5/300s), `getGenericLimiter` (60/60s)
- `src/lib/rate-limit/get-ip.ts` — `getIp(req)` extracts client IP from standard proxy headers
- `src/lib/rate-limit/index.ts` — barrel export

Files changed:
- `src/lib/actions/wizard.ts` — `saveBusinessStep` rate-limited via `getSlugCheckLimiter` keyed by `user.id`
- `.env.example` — added `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (optional, passthrough when absent)
- `src/lib/env.ts` — added optional Upstash env vars to server schema

Tests: 101/101 passing (89 existing + 12 new)

**Block D — Structured Logging** ✅ Done

Files added:
- `src/lib/log/logger.ts` — `logger` (pino, pretty in dev / JSON in prod) + `getRequestLogger(reqId, route)` + `trySentryCrumb` hook (auto-activates when `@sentry/nextjs` installed)
- `src/lib/log/with-request-logging.ts` — `withRequestLogging(route, handler)` HOF for route handlers
- `src/lib/log/index.ts` — barrel export

Files changed:
- `src/lib/errors/to-response.ts` — `console.error` → `logger.error`
- `src/lib/actions/wizard.ts` — `console.error` → `logger.error`
- `src/lib/env.ts` — `console.warn` kept (initialization order; logger reads env vars from this file)
- `.env.example` + `src/lib/env.ts` — added `LOG_LEVEL` + `LOG_PRETTY` optional vars
- `src/lib/errors/__tests__/to-response.test.ts` — updated spy from `console.error` → `logger.error`

Tests: 110/110 passing (101 existing + 9 new)

**Block F — Wizard Polish (LaunchLoader + Fixed Phone Prefix)** ✅ Done

Files added:
- `src/components/ui/LaunchLoader.tsx` — full-screen branded overlay with framer-motion cat mark pulse + 4 rotating status messages (900ms each); shown while completeSetup() runs; unmounts naturally on redirect
- `src/components/wizard/CountryPhoneInput.tsx` — fixed read-only country dial code chip + national number input; emits E.164 on every keystroke; handles country-change re-assembly
- `src/components/ui/__tests__/LaunchLoader.test.tsx` — 6 unit tests (open/closed, message sequence, last-message persistence, aria attributes)
- `src/components/wizard/__tests__/CountryPhoneInput.test.tsx` — 8 unit tests (HN/MX E.164 assembly, mount split, country change, aria, error display, input filtering)

Files changed:
- `src/components/wizard/SetupWizard.tsx` — `isLaunching` state; step-9 sets it before completeSetup(), resets on error, stays true until redirect unmounts; `<LaunchLoader>` conditionally rendered
- `src/components/wizard/steps/Step3Branch.tsx` — phone field swapped to `<CountryPhoneInput>` with fixed prefix from `step3.country`; removed now-redundant PHONE_EXAMPLE const
- `src/components/wizard/steps/Step7Messaging.tsx` — WhatsApp field swapped to `<CountryPhoneInput>` reading country from `data.step3.country`; removed DEFAULT_COUNTRY dependency and handleWaCommit (E.164 assembled by CountryPhoneInput)
- `src/i18n/locales/es.json` + `en.json` — added keys under `wizard.confirm.launching.*` and `wizard.steps.{branch,messaging}.phone.*`
- `DECISIONS.md` — ADR-006 (phone prefix fixed from business country), ADR-007 (LaunchLoader presentation-only)

Tests: 125/125 passing (110 existing + 15 new)

**Block E** — Not started

---

## Phase 2.6 — Business & Staff Media 🟡

**Branch:** `feature/media-upload` (based on `development`)

**Goal:** Let owners upload a business logo and a photo per staff member. Foundation only in Block A — no UI yet.

**Block A — Storage Infrastructure** ✅ Done

Files added:
- `supabase/migrations/0008_storage_buckets.sql` — `business-logos` (2 MB) + `staff-avatars` (1 MB) buckets with RLS policies
- `src/components/shared/ImageUpload.tsx` — reusable `'use client'` upload component (MIME + size validation, canvas resize ≤ 1024px, upsert to Storage, public URL emission)
- `src/components/shared/__tests__/ImageUpload.test.tsx` — 7 tests (placeholder, img render, size rejection, MIME rejection, upload path, aria-label, disabled)
- `src/i18n/locales/es.json` + `en.json` — `media.upload.*` keys (button, change, uploading, tooLarge, wrongType, failed)
- `DECISIONS.md` — ADR-013 (storage path convention), ADR-014 (no crop library)

Tests: 206/206 passing (198 existing + 7 new, 1 updated for img query fix)

**Block B — Business Logo Upload** ✅ Done

Files added:
- `src/app/[locale]/(dashboard)/settings/page.tsx` — settings server page with Brand section (Card layout)
- `src/components/dashboard/settings/BrandSettingsForm.tsx` — `'use client'`, wires `<ImageUpload />` to `updateBusinessLogo` server action + sonner toast
- `src/components/dashboard/SetupLogoBanner.tsx` — `'use client'` nudge banner (session-only dismiss via useState)
- `src/lib/actions/media.ts` — `updateBusinessLogo` + `updateStaffAvatar` server actions (authed client, RLS-enforced)
- `src/lib/actions/__tests__/media.test.ts` — 6 tests (UNAUTHORIZED, NOT_FOUND, success for both actions)
- `src/components/dashboard/settings/__tests__/BrandSettingsForm.test.tsx` — 5 tests
- `src/components/dashboard/__tests__/SetupLogoBanner.test.tsx` — 6 tests

Files changed:
- `src/app/[locale]/(dashboard)/dashboard/page.tsx` — fetch `logo_url` + wire `<SetupLogoBanner />`
- `src/components/dashboard/DashboardShell.tsx` — mount `<Toaster position="bottom-right" />`
- `src/i18n/locales/es.json` + `en.json` — `settings.brand.*` + `dashboard.banners.logo.*` keys
- `DECISIONS.md` — ADR-015 (session-only banner dismiss)

Tests: 223/223 passing (206 existing + 17 new)

**Block C — Staff Avatar Upload** ✅ Done

Files added:
- `src/app/[locale]/(dashboard)/team/page.tsx` — server component, responsive grid of active staff
- `src/components/dashboard/team/StaffCard.tsx` — avatar or initials placeholder + Dialog trigger
- `src/components/dashboard/team/EditStaffDialog.tsx` — Dialog with `<ImageUpload />` wired to `updateStaffAvatar`
- `src/lib/format/initials.ts` — `getInitials(displayName)` helper
- `src/lib/format/__tests__/initials.test.ts` — 8 tests
- `src/components/dashboard/team/__tests__/StaffCard.test.tsx` — 5 tests
- `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` — 7 tests
- `src/i18n/locales/es.json` + `en.json` — `team.*` keys
- `DECISIONS.md` — ADR-016 (avatar-only team page for Phase 2.6)

Files changed:
- `src/lib/format/index.ts` — barrel export for `getInitials`

Tests: 245/245 passing (225 existing + 20 new)

---

### Phase 2.6 Retro

**What shipped:** Business logo upload from `/dashboard/settings` (Block B) and staff avatar upload from `/dashboard/team` (Block C), built on a shared `<ImageUpload />` component and Supabase Storage buckets with RLS (Block A). The reusable component absorbed canvas resize, MIME validation, and loading state — Blocks B and C consumed it with zero duplication.

**What surprised us:** The ADR numbers in the phase spec (ADR-008/009) were already occupied by Phase 2.5 decisions, requiring renumbering to ADR-013/014. The code review (after Blocks A+B) caught a real security gap in the staff-avatars RLS — non-owner staff could overwrite each other's avatars by only checking the business_id folder, not the staff_id subfolder. Fixed before Block C.

**What to revisit in Phase 5:** Full team management (invite, deactivate, role assignment, schedule editing). The team page in Phase 2.6 is intentionally minimal — avatar-only edit as defined in ADR-016. The `updateStaffAvatar` action is already in `media.ts` ready for Phase 5 to consume.

---

## Landing Page (Parallel Deliverable) ✅

**Branch:** `feature/landing-page` (based on `development`)

**Goal:** MVP marketing landing at `/[locale]` — replaces Phase 0 smoke test. Fully static, dark surface, no Supabase calls.

**Sections shipped:**
1. Hero — sticky nav + animated SVG booking-flow illustration (framer-motion) + headline + 2 CTAs → `/[locale]/login`
2. Features — 3-column responsive grid, lucide icons, violet-faint icon containers
3. CTASection — eyebrow + H2 + CTA + footnote on `--color-bg-surface`
4. Footer — 3-column layout + language switcher (ES | EN) + copyright

**Key files:**
- `src/app/[locale]/page.tsx` — smoke test removed; assembles 4 landing components
- `src/components/landing/Hero.tsx` — client component (entrance animations, imports HeroAnimation)
- `src/components/landing/HeroAnimation.tsx` — 'use client', inline SVG Booking Flow animation, `useReducedMotion` honored
- `src/components/landing/Features.tsx` — server component
- `src/components/landing/CTASection.tsx` — server component
- `src/components/landing/Footer.tsx` — server component
- `src/components/landing/LanguageSwitcher.tsx` — client component (useRouter)
- `src/components/landing/__tests__/` — 6 test files, 73 new tests
- `src/i18n/locales/es.json` + `en.json` — all `landing.*` keys (0 new keys for animation)

**Tests:** 198/198 passing (125 existing + 73 new)

**Decisions:** ADR-LP-001 (landing at /[locale], not route group), ADR-LP-002 (fully static), ADR-LP-004 (inline SVG + framer-motion, no new deps), ADR-LP-005 (Booking Flow concept), ADR-LP-006 (aria-hidden decorative)

---

## Phase 3 — Public Booking Flow 🟡

**Goal:** A client opens a booking URL, picks a slot, and books in <60s.

URL structure: `/[locale]/[businessSlug]/[branchSlug]/[staffSlug]`

**Block A — Public Route Access + Routing** ✅ Done

Files added:
- `supabase/migrations/0008_booking_public_read_rls.sql` — anon read policies for businesses, branches, staff, services, branch_services, staff_branches, staff_availability, appointments
- `src/lib/booking/queries.ts` — getBusinessBySlug, getBranchByBizAndSlug, getStaffByBranchAndSlug, getActiveServicesForStaff, getBranchCountForBusiness
- `src/app/[locale]/(booking)/[businessSlug]/page.tsx` — business landing scaffold
- `src/app/[locale]/(booking)/[businessSlug]/[branchSlug]/page.tsx` — branch page scaffold
- `src/app/[locale]/(booking)/[businessSlug]/[branchSlug]/[staffSlug]/page.tsx` — booking page scaffold

Files changed:
- `src/middleware.ts` — added SYSTEM_SEGMENTS set + isPublicBookingPath(); booking paths explicitly pass through before auth check
- `src/components/dashboard/DashboardShell.tsx` — fixed pre-existing lint error (setState in useEffect → lazy initializer)

Key decisions:
- ADR-019: RLS migration required (no pre-existing anon read policies)
- ADR-020: Booking pages use existing (booking) route group, not flat [bizSlug] structure

**Block B — Slot Calculation Engine** ✅ Done

Files added:
- `src/lib/booking/slots.ts` — `localTimeToUTC`, `computeSlots` (exported pure function), `getAvailableSlots` (async, loads from DB)
- `tests/booking/slots.test.ts` — 9 tests: 4 B3 scenarios + 3 B2 edge cases + 2 TZ unit tests

No DB migration needed — `idx_appointments_staff_starts (staff_id, starts_at)` already exists (migration 0001).
DST handling via native `Intl.DateTimeFormat` (Node 22 built-in) — `date-fns-tz` not required.

**Block C — Booking API Endpoints** ✅ Done

Files added:
- `src/lib/schemas/booking.ts` — slotsQuerySchema + createBookingSchema (Zod v4)
- `src/lib/booking/booking-code.ts` — generateBookingCode() + generateUniqueBookingCode() with retry
- `src/app/api/booking/slots/route.ts` — GET, rate-limited by IP, HATEOAS response
- `src/app/api/booking/create/route.ts` — POST, slot pre-check + DB race guard, client upsert, booking_code retry
- `supabase/migrations/0009_appointments_booking_code.sql` — booking_code column + idx_appointments_booking_code + idx_appointments_no_slot_overlap
- `tests/booking/booking-code.test.ts` — 5 tests (format, charset, uniqueness, retry, exhaustion)
- `tests/booking/booking-schemas.test.ts` — 13 tests (valid/invalid UUIDs, dates, E.164 phone, email)
- `tests/booking/api-slots.test.ts` — 6 tests (200, empty, 400, 429)
- `tests/booking/api-create.test.ts` — 9 tests (201, existing client, 400, 409, 429, 404)

Tests: 168/168 passing

**Block D — Public UI** ✅ Done

Files added:
- `src/app/[locale]/(booking)/[businessSlug]/_components/` — (none; pages are server components)
- `src/app/[locale]/(booking)/[businessSlug]/[branchSlug]/[staffSlug]/_components/BookingFlow.tsx` — 5-step booking flow ('use client'): service picker, date calendar (28-day), slot grid (fetches /api/booking/slots), client form (CountryPhoneInput), confirmation screen with KLY-XXXX
- `tests/booking/vertical-copy.test.ts` — 9 tests: vertical appointmentNoun/staffNoun/serviceNoun values for barbershop and fitness, booking namespace keys present in both locales, tagline composition
- `tests/booking/booking-flow.test.tsx` — 9 tests: renders services, staff initials, step navigation, form validation (empty name, short name, missing phone), happy-path POST call, 409 slot-taken redirect

Files changed:
- `src/app/[locale]/(booking)/[businessSlug]/page.tsx` — full D1: logo, vertical-aware heading, branch list, single-branch redirect
- `src/app/[locale]/(booking)/[businessSlug]/[branchSlug]/page.tsx` — full D2: services section (formatCurrency), staff section (avatar/initials, "Reservar con X" CTAs)
- `src/app/[locale]/(booking)/[businessSlug]/[branchSlug]/[staffSlug]/page.tsx` — full D3: loads all data, resolves business-language translations, renders BookingFlow
- `src/lib/booking/queries.ts` — added getBranchesForBusiness + getStaffForBranch
- `src/i18n/locales/es.json` — added booking.* namespace (business, branch, flow, form, success, errors)
- `src/i18n/locales/en.json` — added booking.* namespace (same keys in English)

Key decisions:
- Business language overrides URL locale: server pages import both JSON files directly and select based on business.default_language
- slotTakenError is a separate state from slotsError so it persists through slot re-fetch on 409
- Light surface tokens (--color-bg-light, --color-text-on-light) used throughout; violet CTAs

**Block E — E2E + Vertical Coverage** ✅ Done

Files added:
- `playwright.config.ts` — Playwright config (testDir: tests/e2e, webServer: pnpm dev, timeout: 60s, workers: 1)
- `tests/e2e/booking.spec.ts` — 3 E2E tests: barbershop happy path, fitness vertical copy + booking, slot-taken 409 via page.route() mock
- `tests/booking/helpers/seed.ts` — seedBusiness(vertical) + cleanupBusiness(bizId) using admin Supabase client

Files changed:
- `vitest.config.ts` — added exclude for tests/e2e/** so vitest ignores Playwright specs
- `package.json` — added test:e2e:ui and test:e2e:install scripts
- `.github/workflows/ci.yml` — added e2e job (gated on vars.E2E_ENABLED = 'true' and Supabase secrets)
- `DECISIONS.md` — ADR-018 (booking code format), ADR-019 (seed uses service-role, no auth user), ADR-020 (slot-taken test uses page.route() mock)

Key decisions:
- ADR-019: seedBusiness() requires no auth user — businesses table has no owner_id; staff.user_id is nullable
- ADR-020: Slot-taken test uses page.route() mock for reliability — real race-condition guard tested in unit tests
- CI e2e job gated on repository variable E2E_ENABLED to prevent failures when Supabase secrets aren't configured

**Phase 3 Retro:**

**What shipped:** Full public booking flow — 3 unauthenticated pages (business landing, branch page, 5-step booking flow), 2 API endpoints (slots GET, create POST), slot calculation engine with DST support, booking code generation (KLY-XXXX), and E2E test infrastructure. Clients can book in under 60 seconds on a mobile browser.

**What surprised us:** The anon RLS policies were never pushed to remote Supabase — the migration existed locally but not on the live DB. All pages 404'd until the migration was applied remotely. Lesson: always verify remote state after adding new RLS migrations, not just local state.

**What to revisit in Phase 4:** Sending the KLY-XXXX code via WhatsApp confirmation message. The booking code is generated and displayed; the messaging dispatch (pg_cron + Edge Function + WhatsApp Cloud API) is Phase 4.

---

## Stack Reference

| Layer | Package | Version pinned in lockfile |
|-------|---------|---------------------------|
| Framework | Next.js | 16.2.x |
| UI runtime | React | 19.2.x |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui (base-ui) | latest at install |
| DB / Auth | Supabase | `ouexfehqxpgewzgytjgc` |
| i18n | next-intl | latest at install |
| Forms | react-hook-form + zod | latest at install |
| Node (required) | Node.js | 22 LTS (`nvm use 22`) |

---

## Key Files Quick Reference

| What | Where |
|------|-------|
| Design tokens | `src/app/globals.css` |
| Logo component | `src/components/shared/Logo.tsx` |
| Logo asset | `public/klyro_logo_w.png` |
| Vertical registry | `src/lib/verticals/registry.ts` |
| Env validation | `src/lib/env.ts` |
| Supabase clients | `src/lib/supabase/` (client, server, admin) |
| Auth actions | `src/lib/actions/auth.ts` |
| Wizard actions | `src/lib/actions/wizard.ts` |
| Wizard schemas | `src/lib/schemas/wizard.ts` |
| Wizard components | `src/components/wizard/` |
| Auth callback | `src/app/[locale]/(auth)/callback/route.ts` |
| Setup wizard page | `src/app/[locale]/(setup)/setup/page.tsx` |
| Middleware | `src/middleware.ts` |
| DB migrations | `supabase/migrations/` |
| i18n strings | `src/i18n/locales/` |
| CI workflow | `.github/workflows/ci.yml` |
