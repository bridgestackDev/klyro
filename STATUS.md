# Klyro — Build Status

**Last updated:** 2026-05-24
**Active phase:** Phase 2.6 — Business & Staff Media (Block A done) | Phase 2.5 Block E pending

---

## Phase Progress

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation | ✅ Done | All 12 tables, RLS, types, brand, CI |
| 1 | Auth & Onboarding Shell | ✅ Done | Magic link confirmed working end-to-end |
| 2 | Setup Wizard | ✅ Done | 9-step wizard, all DB writes, admin client RLS fix |
| 2.5 | Hardening & Localization | 🟡 In progress | Blocks A–D+F done; Block E pending |
| 2.6 | Business & Staff Media | 🟡 In progress | Block A done; B–C pending |
| LP | Landing Page (parallel) | ✅ Done | `/[locale]` — 4 sections, fully static, dark surface |
| 3 | Public Booking Flow | ⬜ Not started | `/[biz]/[branch]/[staff]` |
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

**Block C — Staff Avatar Upload** ⬜ Not started

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

## Phase 3 — Public Booking Flow (next up)

**Goal:** A client opens a booking URL, picks a slot, and books in <60s.

URL structure: `/[locale]/[businessSlug]/[branchSlug]/[staffSlug]`

Key work:
1. Slot calculation engine — `staff_availability` minus existing `appointments` minus buffer
2. `GET /api/booking/slots` route handler
3. `POST /api/booking/create` route handler (creates `appointments` + `clients` rows)
4. Public booking page UI (mobile-first, light surface tokens)
5. Booking confirmation screen with code (`KLY-XXXX`)

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
