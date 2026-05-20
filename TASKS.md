# Klyro — Task List

**Last updated:** 2026-05-20

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

### Block C — Rate Limiting Infrastructure ⬜
- [ ] C1: `src/lib/rate-limit/client.ts` — Upstash client + in-memory fallback
- [ ] C2: `src/lib/rate-limit/limiters.ts` — pre-defined limiters
- [ ] C3: Apply slug-check limiter to wizard slug-check
- [ ] C4: `src/lib/rate-limit/get-ip.ts` — IP extraction helper
- [ ] C5: Unit tests
- [ ] C6: README rate limiting section

### Block D — Structured Logging ⬜
- [ ] D1: `src/lib/log/logger.ts` — pino instance
- [ ] D2: Replace console.log/error/warn in src/
- [ ] D3: Request logging wrapper for API routes
- [ ] D4: Sentry breadcrumbs for warn+ logs
- [ ] D5: Unit tests

### Block E — Wizard E2E Test ⬜
- [ ] E1: `tests/e2e/wizard.spec.ts` — full wizard journey for barbershop
- [ ] E2: `tests/e2e/helpers/` — createTestUser, test-db, wizard-page POM
- [ ] E3: `playwright.config.ts` — baseURL, headless, retries, webserver
- [ ] E4: CI integration — `.github/workflows/ci.yml`
- [ ] E5: `package.json` scripts — test:e2e, test:e2e:ui, test:e2e:install

---

## Phase 3 — Public Booking Flow

- [ ] Route: `/[businessSlug]` — business landing (name, branches list)
- [ ] Route: `/[businessSlug]/[branchSlug]` — branch page (staff list, services)
- [ ] Route: `/[businessSlug]/[branchSlug]/[staffSlug]` — booking page (calendar + slot picker)
- [ ] Slot calculation engine: `staff_availability` minus existing `appointments` minus buffer
- [ ] Booking form: client name + WhatsApp number + service picker + slot confirm
- [ ] `POST /api/booking/create` route handler
- [ ] `GET /api/booking/slots` route handler
- [ ] Booking page copy adapts to vertical (`bookingPageHints` from registry)
- [ ] Mobile-first layout (WCAG AA target)
- [ ] Success screen with booking code (`KLY-XXXX`)
- [ ] E2E test: full booking journey for barbershop vertical
- [ ] E2E test: full booking journey for fitness vertical (vertical coverage check)
- [ ] Typecheck + lint pass
- [ ] Commit Phase 3

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
