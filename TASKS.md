# Klyro — Task List

**Last updated:** 2026-05-25

Legend: ✅ Done · 🟡 In progress / built · ⬜ Not started · 🔴 Blocked

---

## ✅ Phase 1 completed tasks

- [x] DB trigger `0005_auth_trigger.sql` — fixed `app_metadata` → `raw_app_meta_data` (was crashing every signup)
- [x] Callback URL fixed: `/auth/callback` → `/callback` (route group `(auth)` is URL-invisible)
- [x] Root layout `<html>`/`<body>` — moved to `app/layout.tsx` for Next.js 16 compliance
- [x] Callback route handles `?error=` redirects from Supabase (expired/invalid links)
- [x] Production logo deployed — `public/klyro_logo_w.png` via `next/image` in `Logo.tsx`
- [x] CI fixed — pnpm version conflict + `ERR_PNPM_IGNORED_BUILDS` resolved
- [x] Dev server heap capped at 4 GB (`NODE_OPTIONS` in `package.json dev` script)
- [x] Magic link confirmed working end-to-end

---

## ✅ Phase 2 — Setup Wizard

- [x] Wizard shell: modal card UI, sticky header (step counter + progress bar), sticky footer (Back / Continue)
- [x] Step 1 — Vertical selection: 8-card grid from registry
- [x] Step 2 — Business name + slug (auto-generated, editable)
- [x] Step 3 — First branch: name, address, city, timezone picker, phone; returns `branchSlug`
- [x] Step 4 — Services catalog: pre-seeded from vertical defaults, add/edit/remove rows
- [x] Step 5 — Staff: owner as first staff member (display name, slug)
- [x] Step 6 — Availability: weekly grid (Mon–Sun, open/close times per day)
- [x] Step 7 — Messaging channel: WhatsApp number input (primary), email fallback
- [x] Step 8 — Booking link preview (shows `/[bizSlug]/[branchSlug]/[staffSlug]`)
- [x] Step 9 — Review & confirm: summary of all steps
- [x] On confirm: set `businesses.onboarding_completed = true`, redirect to `/dashboard`
- [x] Persist wizard progress to `localStorage` (survive page refresh mid-wizard)
- [x] i18n strings for all wizard steps (es + en)
- [x] Unit tests: vertical registry resolves defaults for each of the 7 active verticals

### Security hardening (post code review)
- [x] C1: Server actions verify client-supplied `businessId`/`branchId`/`staffId` against DB — prevents cross-tenant writes
- [x] C2: Zod `safeParse()` added at top of all wizard server actions (server-side validation)
- [x] I2: Update errors checked in `saveBranchStep`, `saveStaffStep`, `saveMessagingStep`
- [x] I3: `saveServicesStep` uses atomic `replace_branch_services` RPC (migration `0007`) — no data loss on partial failure
- [x] I4: `localStorage` restore validates shape with `wizardStorageSchema` before applying
- [x] I5: Postgres `23505` slug conflict maps to user-friendly error message
- [x] S1: All label/input pairs have `htmlFor`/`id` associations (Steps 2, 3, 5, 6, 7)
- [x] S2: Service list rows keyed by stable `clientId` (not array index)
- [x] S3: WizardShell close button `aria-label` uses i18n `t("closeButton")`
- [x] S6: Availability time fields validated against `^\d{2}:\d{2}$` regex in schema
- [x] DB types regenerated — `replace_branch_services` RPC now in `src/types/database.ts`

---

## Phase 2.5 — Hardening & Localization

### Block A — Error Model & Global Handler ✅
- [x] A1: `src/lib/errors/api-error.ts` — ApiError class + ERROR_CODES enum + static factories
- [x] A2: `src/lib/errors/to-response.ts` — toErrorResponse(error) → NextResponse
- [x] A3: `src/app/[locale]/error.tsx` — branded error boundary (use client)
- [x] A4: `src/app/[locale]/not-found.tsx` — branded 404 page
- [x] A5: Migrate `wizard.ts` actions to use ApiError (try/catch wrappers)
- [x] A6: i18n keys for error codes + boundary.* + notFound.*
- [x] A7: Unit tests — ApiError factories + toErrorResponse (ZodError, PostgrestError, unknown)

### Block B — Validation + Country Catalog + Formatters ✅
- [x] B1: `src/lib/validation/phone.ts` — libphonenumber-js wrapper
- [x] B2: `src/lib/validation/slug.ts` — consolidate slug logic
- [x] B3: `src/lib/i18n/countries.ts` — country catalog (HN + 6 LATAM + US)
- [x] B4: `src/lib/format/currency.ts` — formatCurrency
- [x] B5: `src/lib/format/date.ts` — formatDate / formatTime / formatDateTime / formatRelative
- [x] B6: `src/lib/format/phone.ts` — formatPhoneE164 / formatPhoneDisplay
- [x] B7: Wizard migration — phone validation on steps 2, 3, 7, 9; formatCurrency on steps 4, 9
- [x] B8: Unit tests

### Block B.1 — Country Selection in Wizard ✅
- [x] B1.1: `src/lib/i18n/detect-country.ts` helper + 6 unit tests
- [x] B1.2: `step3Schema` accepts `country` (enum from COUNTRIES keys, default HN)
- [x] B1.3: `saveBranchStep` persists `country` to branches + UPDATEs business country + currency
- [x] B1.4: `Step3Branch` — Country select before city, timezone autosuggest on change, phone validation uses country
- [x] B1.5: `WizardProvider` accepts `locale` prop; seeds country from detected locale; patches absent country on localStorage restore
- [x] B1.6: i18n keys `wizard.steps.branch.country.{label, help}` in es + en

### Block C — Rate Limiting Infrastructure ✅
- [x] C1: `src/lib/rate-limit/client.ts` — Upstash client + passthrough fallback (no Redis in dev/CI)
- [x] C2: `src/lib/rate-limit/limiters.ts` — pre-defined limiters (slug-check, booking, auth, generic)
- [x] C3: Apply slug-check limiter to wizard slug-check (`saveBusinessStep`, keyed by user.id)
- [x] C4: `src/lib/rate-limit/get-ip.ts` — IP extraction helper for route handlers
- [x] C5: Unit tests (12 tests — passthrough, Upstash-backed, getIp, lazy singletons)
- [x] C6: env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` added to `.env.example` + `env.ts`

### Block D — Structured Logging ✅
- [x] D1: `src/lib/log/logger.ts` — pino instance (pretty in dev, JSON in prod)
- [x] D2: Replace console.error in `to-response.ts` + `wizard.ts`; `env.ts` console.warn kept intentionally (initialization order)
- [x] D3: `src/lib/log/with-request-logging.ts` — `withRequestLogging(route, handler)` wrapper
- [x] D4: Sentry breadcrumbs for warn+ logs via try/catch dynamic hook (no-ops until @sentry/nextjs installed)
- [x] D5: Unit tests (9 tests — logger methods, getRequestLogger, withRequestLogging pass/fail)

### Block F — Wizard Polish (LaunchLoader + Phone Prefix) ✅
- [x] F1: `src/components/ui/LaunchLoader.tsx` — branded overlay with framer-motion pulse + 4 rotating messages (900ms), aria-live/aria-busy
- [x] F2: Wire `isLaunching` state in SetupWizard; step 9 sets it before `completeSetup()`, resets on error
- [x] F3: `src/components/wizard/CountryPhoneInput.tsx` — fixed dial code chip + national input, emits E.164, handles country-change re-assembly
- [x] F4: `Step3Branch.tsx` — phone swapped to `<CountryPhoneInput>` using `step3.country`
- [x] F5: `Step7Messaging.tsx` — WhatsApp swapped to `<CountryPhoneInput>` reading country from `data.step3.country`
- [x] F6: i18n keys added under `wizard.confirm.launching.*` and `wizard.steps.{branch,messaging}.phone.*` (es + en)
- [x] F7: Unit tests — LaunchLoader (6 tests) + CountryPhoneInput (8 tests); pnpm test 125/125 green

### Block E — Wizard E2E Test ⬜
- [ ] E1: `tests/e2e/wizard.spec.ts` — full wizard journey for barbershop
- [ ] E2: `tests/e2e/helpers/` — createTestUser, test-db, wizard-page POM
- [ ] E3: `playwright.config.ts` — baseURL, headless, retries, webserver
- [ ] E4: CI integration — `.github/workflows/ci.yml`
- [ ] E5: `package.json` scripts — test:e2e, test:e2e:ui, test:e2e:install

---

## Phase 2.6 — Business & Staff Media

### Block A — Storage Infrastructure ✅
- [x] A1: `supabase/migrations/0008_storage_buckets.sql` — `business-logos` + `staff-avatars` buckets with file size limits, MIME allowlists, and RLS policies
- [x] A2: `src/components/shared/ImageUpload.tsx` — reusable `'use client'` component (MIME + size validation, canvas resize ≤ 1024px, upsert upload, public URL emission, loading state, aria-label, keyboard support)
- [x] A3: `src/i18n/locales/es.json` + `en.json` — `media.upload.*` i18n keys (button, change, uploading, tooLarge, wrongType, failed)
- [x] A4: `src/components/shared/__tests__/ImageUpload.test.tsx` — 7 unit tests
- [x] A5: `DECISIONS.md` — ADR-013 (path convention), ADR-014 (no crop library)
- [x] A6: `STATUS.md` + `TASKS.md` updated

### Block B — Business Logo Upload ✅
- [x] B1: `src/app/[locale]/(dashboard)/settings/page.tsx` — server component with Brand section
- [x] B2: `src/components/dashboard/settings/BrandSettingsForm.tsx` — uses `<ImageUpload />`, calls `updateBusinessLogo` server action, shows sonner toast
- [x] B3: `src/lib/actions/media.ts` — `updateBusinessLogo(logoUrl)` + `updateStaffAvatar(staffId, url)` server actions
- [x] B4: `src/components/dashboard/SetupLogoBanner.tsx` — session-only dismissible banner when `logo_url` is null
- [x] B5: Wire `<SetupLogoBanner />` into dashboard home page
- [x] B6: i18n keys: `settings.brand.*`, `dashboard.banners.logo.*`
- [x] B7: Tests: media.test.ts (action), BrandSettingsForm.test.tsx, SetupLogoBanner.test.tsx
- [x] B8: `<Toaster />` mounted in DashboardShell

### Block C — Staff Avatar Upload ✅
- [x] C1: `src/app/[locale]/(dashboard)/team/page.tsx` — server component, grid of active staff
- [x] C2: `src/components/dashboard/team/StaffCard.tsx` — avatar or initials placeholder + "Editar" button
- [x] C3: `src/components/dashboard/team/EditStaffDialog.tsx` — base-ui Dialog with `<ImageUpload />`
- [x] C4: `src/lib/actions/media.ts` — `updateStaffAvatar` already shipped in Block B
- [x] C5: `src/lib/format/initials.ts` — `getInitials(displayName)` helper
- [x] C6: i18n keys: `team.*`
- [x] C7: Tests: initials.test.ts (8), StaffCard.test.tsx (5), EditStaffDialog.test.tsx (7)
- [x] C8: `git tag phase-2.6-done`

> **Phase 5 reminder:** Full team management (invite, deactivate, role, schedule) deferred from Phase 2.6 per ADR-016. The team page is avatar-only for now.

---

## Landing Page (Parallel Deliverable) ✅

- [x] LP1: Branch `feature/landing-page` off `development`
- [x] LP2: `src/components/landing/Hero.tsx` — client component, framer-motion pulse, nav + headline + 2 CTAs
- [x] LP3: `src/components/landing/Features.tsx` — server component, 3-card grid with lucide icons
- [x] LP4: `src/components/landing/CTASection.tsx` — server component, eyebrow + H2 + CTA + footnote
- [x] LP5: `src/components/landing/Footer.tsx` — server component, 3-column + copyright
- [x] LP6: `src/components/landing/LanguageSwitcher.tsx` — client component, ES | EN toggle via next/navigation
- [x] LP7: `src/app/[locale]/page.tsx` — smoke test removed, 4 landing components wired
- [x] LP8: `src/i18n/locales/es.json` — all `landing.*` keys added (25 keys)
- [x] LP9: `src/i18n/locales/en.json` — all `landing.*` keys added (25 keys)
- [x] LP10: Unit tests — Hero (5), Features (3), CTASection (4), Footer (5), i18n (50) = 67 new tests
- [x] LP11: `pnpm typecheck` — 0 new errors (3 pre-existing `.next/dev/types` errors unchanged)
- [x] LP12: `pnpm lint` — 0 new errors (1 pre-existing `DashboardShell.tsx` error unchanged)
- [x] LP13: `pnpm test` — 192/192 passing
- [x] LP14: DECISIONS.md — ADR-LP-001 + ADR-LP-002 appended
- [x] LP15: Single commit: `feat(landing): MVP marketing page — hero + features + CTA + footer`

### Landing Hero Animation ✅
- [x] LP-A1: Create `src/components/landing/HeroAnimation.tsx` — 'use client', inline SVG Booking Flow (Client → Booking → Confirmed), framer-motion `useAnimate` loop, `useReducedMotion` honored
- [x] LP-A2: Refactor `src/components/landing/Hero.tsx` — remove Logo mark pulse, import and render `<HeroAnimation />`
- [x] LP-A3: Create `src/components/landing/__tests__/HeroAnimation.test.tsx` — 6 tests (aria-hidden, circles, paths, particle shown/hidden per reduced-motion, text labels)
- [x] LP-A4: Update `Hero.test.tsx` — extend framer-motion mock with new hooks; fix Logo label assertion (mark removed, wordmark aria-label is lowercase "klyro")
- [x] LP-A5: DECISIONS.md — ADR-LP-004, ADR-LP-005, ADR-LP-006 appended
- [x] LP-A6: pnpm typecheck + lint (pre-existing DashboardShell error only) + test 198/198 green
- [x] LP-A7: Single commit: `feat(landing): animated SVG hero`

---

## Phase 3 — Public Booking Flow

### Block A — Public Route Access + Routing ✅
- [x] A1: `src/middleware.ts` — SYSTEM_SEGMENTS + isPublicBookingPath(); booking paths always pass through
- [x] A2: Scaffold pages: [businessSlug]/page.tsx, [businessSlug]/[branchSlug]/page.tsx, [businessSlug]/[branchSlug]/[staffSlug]/page.tsx
- [x] A3: `src/lib/booking/queries.ts` — getBusinessBySlug, getBranchByBizAndSlug, getStaffByBranchAndSlug, getActiveServicesForStaff, getBranchCountForBusiness
- [x] A4: 404 handling via notFound() in each scaffold page (uses existing [locale]/not-found.tsx)
- [x] Migration 0008: anon read RLS policies for all booking-relevant tables

### Block B — Slot Calculation Engine ✅
- [x] B1: `src/lib/booking/slots.ts` — localTimeToUTC + computeSlots (pure) + getAvailableSlots (async DB)
- [x] B2: Edge cases covered: null availability, service > window, full-window appointment, buffer overflow
- [x] B3: `tests/booking/slots.test.ts` — 9 tests (4 B3 scenarios + 3 edge cases + 2 TZ unit tests)
- [x] B4: `idx_appointments_staff_starts (staff_id, starts_at)` confirmed present — no new migration needed

### Block C — Booking API Endpoints ✅
- [x] C1: `src/lib/schemas/booking.ts` — slotsQuerySchema + createBookingSchema
- [x] C2: `src/app/api/booking/slots/route.ts` — GET with rate limiting + logging
- [x] C3: `src/app/api/booking/create/route.ts` — POST with slot race guard + client upsert
- [x] C4: `src/lib/booking/booking-code.ts` — KLY-XXXX generator
- [x] C5: Migration 0009 — `appointments.booking_code` column + idx_appointments_booking_code + idx_appointments_no_slot_overlap
- [x] C6: Tests: happy path, phone validation, slot taken, collision retry, rate limit (168/168 green)

### Block D — Public UI ✅
- [x] D1: Business landing page — branches list, vertical-aware H1, auto-redirect for single-branch
- [x] D2: Branch page — services + staff cards, "Reservar con X" CTAs
- [x] D3: Booking page — 5-step flow (service → date → slot → form → confirmation)
- [x] D4: Light surface tokens throughout
- [x] D5: i18n keys under booking.* namespace (es + en)
- [x] D6: Error/loading states with skeletons
- [x] D7: Tests: vertical copy, booking form validation

### Block E — E2E + Vertical Coverage ✅
- [x] E1: `tests/e2e/booking.spec.ts` — barbershop happy path, fitness vertical copy + booking, slot-taken 409 (page.route() mock)
- [x] E2: `tests/booking/helpers/seed.ts` — seedBusiness(vertical) + cleanupBusiness(bizId)
- [x] E3: CI integration — `.github/workflows/ci.yml` e2e job (gated on vars.E2E_ENABLED)
- [x] E4: `playwright.config.ts` + vitest exclude + package.json scripts
- [x] E5: git tag phase-3-done (run after commit)

---

## Phase 4 — Messaging Engine

- [ ] `MessageRouter` abstraction: picks template by `(vertical, language, channel, type)`
- [ ] WhatsApp Cloud API integration (`/lib/messaging/whatsapp.ts`)
- [ ] Email via Resend + React Email templates
- [ ] SMS via Twilio (optional, behind env flag)
- [ ] Webhook handlers: `/api/webhooks/whatsapp`, `/api/webhooks/resend`, `/api/webhooks/twilio`
- [ ] Webhook signature validation for all three providers
- [ ] Supabase Edge Function `dispatch-due-messages` (called by pg_cron every 5 min)
- [ ] Confirmation message fires immediately on booking
- [ ] 24h reminder: scheduled via `messages.scheduled_at`, dispatched by Edge Function
- [ ] Add `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` to env
- [ ] Unit test: MessageRouter selects correct template for each vertical × channel combination
- [ ] Typecheck + lint pass
- [ ] Commit Phase 4

---

## Phase 5 — Owner Dashboard

- [ ] Dashboard home: today's appointments (count + list), quick stats
- [ ] Agenda view: calendar grid (day / week), appointment cards
- [ ] Clients list: search, total visits, last visit
- [ ] Services management: CRUD for service catalog
- [ ] Team management: invite staff by email, list staff, toggle active
- [ ] Branches management: CRUD for branches, assign staff to branch
- [ ] Links page: copy booking URL, QR code download
- [ ] Settings: business profile, logo upload (Supabase Storage), language/currency
- [ ] Real-time: new booking toast via Supabase Realtime subscription
- [ ] UI copy uses `appointmentNoun` / `staffNoun` from vertical registry
- [ ] Typecheck + lint pass
- [ ] Commit Phase 5

---

## Phase 6 — Staff Dashboard

- [ ] Staff login (accepts invitation link → sets password / OAuth)
- [ ] Staff view: own-day agenda only (RLS enforced)
- [ ] Mark appointment as completed / no-show
- [ ] Verify RLS: staff cannot see other staff's appointments or other businesses
- [ ] Typecheck + lint pass
- [ ] Commit Phase 6

---

## Phase 7 — Polish & QA

- [ ] Responsive audit: all screens on mobile (375px) and tablet (768px)
- [ ] WCAG 2.1 AA: focus rings, color contrast, aria labels on booking pages
- [ ] i18n completeness: all keys present in both `es.json` and `en.json`
- [ ] Empty states: "No tienes citas hoy" with cat mark illustration
- [ ] Error states: network errors, slot taken, booking failed
- [ ] Lighthouse >90 on public booking page (Performance, Accessibility, SEO)
- [ ] Brand consistency pass: violet accent + navy surfaces across all screens
- [ ] Smoke test matrix: 1 barbershop, 1 salon, 1 fitness, 1 carwash — full booking journey each
- [ ] `pnpm audit` — resolve any high/critical vulnerabilities
- [ ] `pnpm outdated` — apply patch + minor updates
- [ ] Internal team uses all 4 fake businesses for one week without blockers
- [ ] Commit Phase 7

---

## Phase 8 — Closed Beta

- [ ] Configure `klyro.app` DNS on Cloudflare
- [ ] Deploy to Vercel (connect repo, set production env vars)
- [ ] Set Supabase Site URL to `https://klyro.app`
- [ ] Add `https://klyro.app/callback` to Supabase Redirect URLs
- [ ] Enable Google OAuth with production credentials
- [ ] Onboard pioneer business #1 (barbershop)
- [ ] Onboard pioneer businesses #2–6 (barbershops)
- [ ] Onboard pioneer businesses #7–10 (salons)
- [ ] Opportunistically onboard 1–2 fitness / spa businesses
- [ ] Day 70 decision gate: retention >60% + 1 non-wedge vertical validated → open self-serve

---

## Ongoing / Maintenance

- [ ] Weekly: `pnpm outdated` + `pnpm audit` (apply patch/minor immediately; major on a branch)
- [ ] Apply Next.js security patches immediately when released
- [ ] Monitor Sentry for new errors after each deploy
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` rotated and out of git history
