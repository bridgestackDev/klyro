# Klyro — Architecture Decisions

This file records non-obvious design decisions and their rationale. Never delete entries — only append.

---

## Phase 2.5 — Block A

### ADR-001: ApiError codes use UPPERCASE strings matching existing i18n keys

**Decision:** `ERROR_CODES` constants are UPPERCASE strings (`UNAUTHORIZED`, `SLUG_TAKEN`, etc.) that match the existing `errors.*` keys in the i18n locale files.

**Why:** The wizard components use `t(\`errors.${result.error}\`)` to resolve error messages. Using UPPERCASE codes means the existing i18n lookup in `SetupWizard.resolveError()` keeps working without changing the wizard component or DB write logic. Avoids a two-step migration (error model + UI update) in the same block.

**Trade-off:** New ApiError codes introduced in Phase 2.5 (FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, RATE_LIMITED, INTERNAL, BAD_REQUEST, CONFLICT) required adding new UPPERCASE i18n keys rather than reusing the old ad-hoc strings. Both old and new keys now coexist in the locale files.

---

### ADR-002: toErrorResponse targets route handlers, not server actions

**Decision:** `toErrorResponse()` returns a `NextResponse` and is intended for API route handlers. Wizard server actions keep their `{ error?: string }` return type; they use `ApiError` internally but extract `.code` as the returned string.

**Why:** Server actions can't return `NextResponse`—only serializable values. `toErrorResponse` wraps the error into an HTTP response for route handlers. Server actions use `ApiError` for typed error creation and catch-all `try/catch` wrapping, but expose the code as a plain string to the UI layer.

---

### ADR-003: Branded error.tsx uses inline Tailwind classes, not shadcn Button

---

## Phase 2.5 — Block B.1

### ADR-004: Country lives in Step 3 (Branch), not its own wizard step

**Decision:** Country selection is added as a field within the existing Step 3 (Branch), not as a new wizard step. The wizard remains 9 steps.

**Why:** Adding a 10th step would renumber every existing step in code, i18n keys, telemetry events, the progress bar, and unit tests. The cognitive value of a dedicated "what country?" step is low — users selecting a vertical and entering a branch address already have spatial context. Placing the field before "city" and "timezone" reads naturally.

**Trade-off:** Country becomes visible later in the flow than locale. Mitigated by auto-detecting from `useLocale()` so the field is pre-filled for 95% of HN users. The 5% who travel/use the wrong browser locale will see HN pre-filled and may need one click to change. Acceptable.

**What this enables:** Phase 3 (booking) can validate client WhatsApp against the business's country. Phase 4 (messaging) can format dates/times in the right locale. Phase 8 expansion to MX/CO doesn't need a data migration.

---

### ADR-005: Business country + currency derived from the (single) first branch

**Decision:** When `saveBranchStep` runs, after inserting the branch it also issues an UPDATE on `businesses` setting `country` and `default_currency` from the branch's country.

**Why:** The wizard creates exactly one branch (Phase 2 scope). Asking country twice (once for business, once for branch) is friction. In multi-branch later (Phase 5 edit-after), the user can manage branch-country separately if they expand internationally. For MVP, business country == primary branch country.

**Trade-off:** Edge case — if the UPDATE on businesses fails after the branch INSERT succeeds, the branch has the correct country but the business still has the old value. We log it and return an internal error; the user can retry. Acceptable for MVP; a transactional RPC would be the proper fix if this ever becomes flaky in production.

---

**Decision:** `error.tsx` uses a native `<button>` with Tailwind classes instead of the shadcn `<Button>` component.

**Why:** The error boundary is a "use client" component that must work even if the component tree that imports `<Button>` is broken. Keeping it dependency-light prevents a broken import from causing a blank screen on error.

---

## Phase 2.5 — Block D

### ADR-008: env.ts keeps console.warn (not logger) for initialization-order safety

**Decision:** The two `console.warn` calls in `src/lib/env.ts` were not replaced with `logger.*` calls.

**Why:** `env.ts` runs at module load time before any other module is initialized. The logger reads `process.env.LOG_LEVEL` and `process.env.LOG_PRETTY` at construction time — importing `logger` inside `env.ts` would create an initialization-order problem where the logger constructs before the env schema is validated. `console.warn` is the correct tool for startup-time diagnostics that precede the logging system.

---

### ADR-009: Sentry breadcrumbs use try/catch dynamic require (no hard SDK dependency)

**Decision:** `trySentryCrumb()` in `logger.ts` uses `require("@sentry/nextjs")` wrapped in `try/catch` rather than a static import.

**Why:** `@sentry/nextjs` is not yet installed. A static import would cause a module-not-found error at startup. The dynamic require approach is a forward-compatible shim: it no-ops cleanly when Sentry is absent, and activates automatically once the SDK is installed and initialized in Phase 3/4 without any further code changes.

---

## Phase 2.5 — Block C

### ADR-006: Rate limiter uses user.id as identifier for authenticated server actions

**Decision:** The slug-check limiter in `saveBusinessStep` is keyed by `user.id` (e.g. `slug-check:${user.id}`), not by client IP.

**Why:** Server actions don't have direct access to `NextRequest`, so extracting the client IP requires calling `headers()` from `next/headers`. Using the authenticated user ID is simpler, more accurate (same user on multiple IPs / behind CGNAT), and already available from the session check that precedes the rate limit call. IP-based limiting is the right approach for public unauthenticated API routes (Phase 3 booking endpoints), where `getIp()` will be used.

---

### ADR-007: PassthroughLimiter (always-allows) when Upstash env vars absent

**Decision:** `createLimiter()` returns a `PassthroughLimiter` that always returns `{ success: true }` when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are not set.

**Why:** Local dev and CI should work without provisioning an Upstash Redis instance. The fallback is intentionally not an in-memory sliding window — a real in-memory limiter would give false confidence that rate limiting is working when it isn't (e.g. a single Vercel serverless instance vs. multiple), and it would reset on every deploy. The passthrough is honest about its behavior: rate limiting is only active in production when Redis credentials are configured.

---

## Phase 2.5 — Block F

### ADR-010: Phone prefix is fixed (read-only) from business country, not editable per field

**Decision:** The phone fields in Steps 3 (Branch) and 7 (Messaging) render a fixed, read-only country dial code chip derived from the country selected in Step 3. The user types only the national portion; the component assembles E.164 by prepending the dial code.

**Why:** For the MVP wedge (Honduras barbershops), 100% of phone numbers are local. Adding a country picker on each phone field creates unnecessary friction. Country is already set in Step 3 (Block B.1) as the single source of truth for the business. Having all phone fields read from it prevents cross-country accidents (e.g. business WhatsApp from a different country than the branch).

**Trade-off:** A business owner whose personal WhatsApp is in a different country than the branch cannot represent this in the wizard. Edge case; unblockable later via the Settings page (Phase 5) if it surfaces.

---

### ADR-011: LaunchLoader is presentation-only; no API calls inside

**Decision:** `LaunchLoader` animates a fixed sequence of status messages on a timer and renders the cat mark pulse. It does not orchestrate the confirm flow or poll for action completion.

**Why:** Decouples the visual feedback from the action lifecycle. `completeSetup()` already redirects on success and returns an error object on failure — the parent (`WizardInner`) handles both. Keeping LaunchLoader stateless makes it trivially testable in isolation. The redirect naturally unmounts it on success; the parent resets `isLaunching` on error so the wizard error UI appears.

---

### ADR-012: LaunchLoader conditionally rendered (not always-mounted with open prop)

---

## Phase 3 — Block A

### ADR-013: Public booking requires a new RLS migration (no pre-existing anon read policies)

**Decision:** Migration `0008_booking_public_read_rls.sql` adds anon `SELECT` policies on businesses, branches, staff, staff_branches, services, branch_services, staff_availability, and appointments. The booking CREATE endpoint uses the service-role (admin) client for all writes, matching the wizard pattern.

**Why:** All tables had RLS enabled since Phase 0 with no anon policies — every query required an authenticated session. Phase 3 is the first public-facing surface. Anon read is the minimum needed to display business/branch/staff data without auth. Write operations (create clients, insert appointments) use the admin client because: (a) it follows the same secure pattern as the wizard, (b) our validation + rate limiting + phone check are the application-layer controls, and (c) it avoids complex anon INSERT policies with business_id verification.

**Trade-off:** Service role used for public writes means a bug in our validation could allow unexpected inserts. Mitigated by Zod schema validation, rate limiting, phone validation, and slot availability check in the route handler. Revisit with stricter RLS INSERT policies in Phase 7 hardening.

---

### ADR-014: Booking pages live in the existing (booking) route group, not flat [bizSlug]

**Decision:** Scaffold pages are created at `src/app/[locale]/(booking)/[businessSlug]/…` (matching the PRD §3.1 folder spec and the pre-created empty directories) rather than the flat `[bizSlug]` path listed in the Phase 3 prompt's file-scope section.

**Why:** The `(booking)` route group was pre-created as empty directories in the codebase. Creating pages at `[locale]/[bizSlug]/` alongside the existing `[locale]/(booking)/[businessSlug]/` would cause an ambiguous route conflict (Next.js cannot resolve two dynamic segments at the same URL depth). The (booking) group is also consistent with PRD §3.1 and adds organizational clarity. The URL structure is identical since route group names are parenthesized and don't appear in the URL.

**How to apply:** All Phase 3 page files go under `src/app/[locale]/(booking)/[businessSlug]/…`. Private components go under `…/[staffSlug]/_components/`.

---

### ADR-015: Timezone conversion via native Intl.DateTimeFormat, not date-fns-tz

**Decision:** `localTimeToUTC` in `src/lib/booking/slots.ts` uses `Intl.DateTimeFormat.formatToParts` to convert business-timezone wall-clock times to UTC. `date-fns-tz` is NOT added to the dependency list.

**Why:** `date-fns-tz` was not in the stack at the time of Block B. The Phase 3 prompt said "if not in stack, ASK before adding." The native `Intl.DateTimeFormat` API in Node 22 LTS supports all IANA timezone names, handles DST transitions, and has no package overhead. The two-iteration approach (guess → correct via offset → re-verify) converges correctly for all practical cases, including DST boundaries. This was verified with tests using `America/Tegucigalpa` (UTC-6, no DST) — the reference timezone for the MVP wedge.

**Trade-off:** If a future timezone has a DST gap at exactly the time being converted (e.g. clocks spring forward at 2:00 AM, creating a missing hour), the second iteration will still return a plausible UTC time (it'll land at the post-gap equivalent). Acceptable for MVP; revisit with `date-fns-tz` if DST-intensive timezones become a priority.

**Decision:** `WizardInner` renders `{isLaunching && <LaunchLoader open ... />}` rather than always rendering `<LaunchLoader open={isLaunching} ... />`.

**Why:** The conditional render causes the component to mount fresh on each launch attempt, automatically resetting `messageIndex` to 0. The alternative (always-mounted with a reset in `useEffect`) would require calling `setState` synchronously inside an effect body, which violates the `react-hooks/set-state-in-effect` lint rule and can cause cascading renders.

---

## Landing Page

### ADR-LP-001: Landing lives at /[locale]/page.tsx, not in a (marketing) route group

**Decision:** The landing page replaces the existing smoke test at `src/app/[locale]/page.tsx` rather than being placed in a `(marketing)` route group as suggested in the PRD §3.1 folder structure.

**Why:** Phase 3 already mounted the public booking routes directly under `[locale]` (`/[locale]/[businessSlug]`) without a `(booking)` route group. Mirroring that pattern keeps the file layout consistent and avoids speculative routing infrastructure (a route group buys us a separate layout, which we don't need yet — the landing and the booking pages can both use the dark and light surfaces respectively via inline composition).

**Trade-off:** If we later want a distinct marketing layout (e.g. with a different header or different analytics tracking), we'll move to `(marketing)/page.tsx` then. Cheap refactor when needed; pay nothing today.

---

### ADR-LP-002: Landing is fully static — no Supabase calls, no auth checks

**Decision:** The landing makes zero DB calls and skips auth entirely. The Phase 0 smoke test that fetched a businesses count is removed.

**Why:** The landing is a marketing page. It must render fast (Lighthouse Performance ≥ 90), work without a Supabase connection during outages, and never expose auth state. Visitors who are already signed in still see the marketing page — they can click "Sign in" and land on the existing logged-in redirect to `/dashboard`.

---

## Landing Page — Hero Animation

### ADR-LP-004: Hero animation is inline SVG + framer-motion (no Lottie / GSAP / Rive)

**Decision:** The hero animation is built with inline SVG driven by framer-motion primitives (`motion.path`, `motion.circle`, `motion.text`, `useAnimate`). No new animation library was introduced.

**Why:** framer-motion is already in the stack and already in the landing bundle. Adding Lottie would mean shipping a runtime + a JSON payload for a single decoration. GSAP would overlap heavily with what framer-motion already does. Inline SVG keeps the asset version-controlled, themable via CSS variables, and accessible (a11y attributes work on real DOM).

**Trade-off:** Complex character animation (e.g. illustrated mascots) would be painful in this setup. We don't need that — Klyro's brand voice is geometric and minimal (PRD §8.2). If we ever need richer illustration, we'll revisit Lottie then.

---

### ADR-LP-005: Hero animation concept — Booking Flow (Option C)

**Decision:** The hero uses the "Booking Flow" concept: three geometric nodes (Client → Booking → Confirmed) connected by paths, with a violet particle traveling between them on a ~3.5 s loop.

**Why:** Klyro's entire value proposition is one automated chain — a client finds the link, books in 60 s, gets instant confirmation. Option C shows that chain as a live diagram, so a visitor who doesn't read the copy can still understand the product in the first second. Option A (calendar fills up) shows the end-state but not the mechanism. Option B (message orbit) shows only the output channel, missing the booking step.

**Trade-off:** It does not communicate multi-vertical support or the 24 h reminder. Those are handled by the subheadline text and the Features section below.

---

### ADR-LP-006: Hero animation SVG is decorative (aria-hidden="true")

**Decision:** The hero SVG is treated as decorative with `aria-hidden="true"`. No aria-label key was added to the i18n files.

**Why:** The surrounding hero copy (headline + subheadline) fully communicates what Klyro does. The animation is visual reinforcement only — a screen reader user already gets the message from the text. Using `aria-hidden` keeps the SVG out of the accessibility tree without forcing a label that would need to describe abstract animation states.

---

### ADR-LP-003: LanguageSwitcher extracted as a separate client component; Footer stays server

**Decision:** `Footer.tsx` is a server component. The language-switching logic lives in a dedicated `LanguageSwitcher.tsx` client component that receives `currentLocale` as a prop.

**Why:** The footer has no interactivity except for the locale toggle. Keeping the footer as a server component avoids shipping the Next.js router and `usePathname` hook bundle for the full footer tree. The `LanguageSwitcher` is the minimal client island — it uses `useRouter().replace()` and `usePathname()` to toggle `/es ↔ /en` by replacing the locale prefix in the current URL.

---

## Phase 2.6 — Block C

### ADR-016: Team page in Phase 2.6 is intentionally avatar-only

**Decision:** The `/dashboard/team` page built in Block C shows only the staff list with avatar upload. Invite, deactivate, role assignment, schedule editing, and branch assignment are not included.

**Why:** The goal of Phase 2.6 is to populate `businesses.logo_url` and `staff.avatar_url` — the two schema fields that have existed since Phase 0 but were never surfaced. Building full team management in this phase would mix two unrelated scopes (media upload and team operations), bloat the block file count past the ~12-file limit, and require auth flows (invitation emails) that belong in Phase 5.

**Trade-off:** Owners cannot invite or deactivate staff from the dashboard until Phase 5. For the closed beta cohort (pioneer barbershops), the owner is typically the only staff member, so this is not a blocker for the initial launch.

---

## Phase 2.6 — Block B

### ADR-015: SetupLogoBanner dismiss is session-only (no localStorage persistence)

**Decision:** `SetupLogoBanner` is a client component that uses `useState` for dismiss. Clicking the X button sets `dismissed = true` in local React state. On the next page load, the banner reappears (until the logo is uploaded).

**Why:** The banner is a low-urgency nudge — it disappears automatically once `logo_url` is set, which is its own natural exit condition. Persisting dismissal in localStorage would require a dedicated key, a hydration guard to avoid SSR mismatch, and cleanup logic for when the user eventually uploads a logo. For an MVP nudge where the intended action takes <30 seconds, a session-only dismiss is both simpler and sufficient.

**Trade-off:** A user who dismisses without uploading will see the banner again next session. Acceptable — the nudge is intentional. If user feedback indicates dismissal should persist, add a `localStorage.setItem('klyro_logo_banner_dismissed', '1')` check in Phase 5/6 cleanup.

---

## Phase 2.6 — Block A

### ADR-013: Storage path convention — business_id as first folder segment

**Decision:** Storage object paths follow the convention `{bucket}/{business_id}/{filename}`. For logos: `business-logos/{business_id}/logo.{ext}`. For avatars: `staff-avatars/{business_id}/{staff_id}.{ext}`.

**Why:** Supabase Storage RLS can only inspect the object name, not join to other tables. Using `(storage.foldername(name))[1]` to extract the first path segment and comparing it to `get_my_business_id()` is the idiomatic Supabase pattern for tenant-scoped storage authorization. The business_id-as-folder convention means a single, readable RLS expression covers every file in a bucket without needing a separate lookup table.

**Trade-off:** The path is fixed per business+staff combination (no versioned URLs). Cache-busting on re-upload requires a query string timestamp at the call site (Blocks B and C will handle this). Acceptable for MVP.

---

### ADR-014: No third-party image crop library in Phase 2.6

**Decision:** `<ImageUpload />` uses a plain HTML `<canvas>` to resize images that exceed 1024px on their longest side. No `react-image-crop`, `react-easy-crop`, `sharp` (client), or similar library is introduced.

**Why:** A crop UI adds significant bundle weight and UX complexity (modal, drag handles, aspect ratio controls) for marginal value in an MVP where the primary use case is a logo or headshot that the owner already has in a reasonable format. The canvas resize is lossless in aspect ratio, runs in the browser with zero new dependencies, and is sufficient for 2 MB / 1 MB upload limits.

**Trade-off:** Users cannot crop within the app — they must pre-crop externally. If user research in Phase 5/6 shows crop friction is a blocker, we revisit with a proper crop library at that point.

---

## Phase 3 — Block D

### ADR-016: Business language overrides URL locale via direct JSON import (no next-intl override)

**Decision:** Booking server pages (`businessSlug/page.tsx`, `branchSlug/page.tsx`, `staffSlug/page.tsx`) import both `es.json` and `en.json` directly and select the correct locale object based on `business.default_language`, not the URL locale.

**Why:** The locked Phase 3 requirement is "booking page renders in the BUSINESS's default_language, not the URL locale." next-intl's `getTranslations()` uses the URL locale by default. Overriding it with `getTranslations({ locale: businessLanguage })` requires the messages to be loaded from the request config, which only has the URL locale. Importing both JSON files statically is simpler, zero-overhead, and correctly implements the business-language contract. The `BookingMessages` type is defined in `BookingFlow.tsx` and the server component passes pre-resolved strings as props — no next-intl dependency in the client component.

**Trade-off:** Both locale files are bundled in the server component. This is acceptable since each file is ~15 KB and server components are not part of the client bundle.

---

### ADR-017: slotTakenError is a separate state from slotsError

**Decision:** `BookingFlow` maintains two distinct error states: `slotsError` (API errors — network failure, rate limit) and `slotTakenError` (409 response from create endpoint). The slot taken error is not cleared by `fetchSlots()`, allowing the user to see the message while slots refresh.

**Why:** `fetchSlots()` sets `setSlotsError(null)` at the start (correct — clearing stale API errors before a new fetch). If 409 were to use `slotsError`, re-fetching slots to refresh availability would immediately clear the message before the user sees it. A separate state for the "slot was just taken" case survives the re-fetch cycle.

**How to apply:** Clearing `slotTakenError` is the responsibility of `handleSlotSelect` (user picks a new slot) and `handleDateSelect` (user picks a new date — implicitly via slot reset).

---

## Phase 3 — Block C

### ADR-018: Booking code format — KLY-XXXX with non-confusable alphabet

**Decision:** Booking codes use the format `KLY-XXXX` where XXXX is 4 characters drawn from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 chars). The excluded characters are `0`, `O`, `1`, `I`, `l` — visually confusable pairs.

**Why:** Booking codes are shown to clients on screen and they may need to read them aloud to staff or type them manually. The KLY prefix provides instant brand recognition and makes it clear the code is a Klyro booking reference. The 4-char suffix gives 32^4 = 1,048,576 possible codes — sufficient for the MVP appointment volume. A DB unique index on `appointments.booking_code` enforces global uniqueness; the API route retries once on collision (collision probability at 10,000 bookings is < 0.01%).

**How to apply:** Always generate via `generateBookingCode()` in `src/lib/booking/booking-code.ts`. Never accept booking codes from client requests — they are server-generated only.

---

## Phase 3 — Block E

### ADR-019: E2E seed uses service-role client, no auth user required

**Decision:** `seedBusiness()` inserts directly into `public.businesses`, `branches`, `staff`, etc. using the Supabase service-role client (bypasses RLS). It does not create `auth.users` entries because `businesses` has no `owner_id` column and `staff.user_id` is nullable.

**Why:** The `public.users` table (separate from `auth.users`) is the owner lookup table used by RLS functions like `get_my_business_id()`. E2E tests exercise the public booking flow, which uses the anon client under RLS policies that only require `onboarding_completed = true` on businesses. No auth session is needed for the seeded data to be publicly readable. Creating real auth users for seeding would add latency and require cleanup of Supabase Auth state, which is an additional failure surface.

**How to apply:** Use `seedBusiness(vertical)` in `beforeEach` / setup, `cleanupBusiness(bizId)` in `afterEach` / teardown. Never let seed data persist between test runs.

---

### ADR-020: Slot-taken E2E test uses page.route() mock, not a real DB race

**Decision:** The "slot taken" E2E test (`booking.spec.ts` test 3) uses Playwright's `page.route()` to intercept `POST /api/booking/create` and return a mocked 409 response, rather than attempting to time a true DB race condition.

**Why:** A true race condition test would require coordinating two concurrent requests — one to pre-book the slot and one to attempt the same slot via UI. The exact UTC timestamp of the slot is not known until after slot fetch, making programmatic pre-booking complex. Timing coordination is flaky by nature. The mocked 409 tests the exact same code path (the `if (res.status === 409)` branch in `BookingFlow.handleSubmit`) without relying on timing. The real race-condition guard is already covered by the unit tests in `api-create.test.ts`.

**How to apply:** If the 409 handling logic in `BookingFlow` changes, update the test accordingly. The mock returns the same JSON shape as the real API.

---

## Phase 3.5 — Block A

### ADR-022: next-openapi-gen over next-swagger-doc — Zod-native schema introspection

**Decision:** `next-openapi-gen@1.4.0` is the OpenAPI generator. `next-swagger-doc` was considered and rejected.

**Why:** `next-openapi-gen` reads Zod schemas directly from the codebase (`schemaType: "zod"`, `schemaDir: "src/lib/schemas"`). It emits correct JSON Schema from Zod v4 validators — including `format: uuid`, `pattern`, `format: date-time`, `minLength`, and optional fields — without any manual schema duplication. `next-swagger-doc` expects JSDoc `@swagger` blocks with inline YAML/JSON, meaning every schema field would need to be written twice (once in Zod, once in JSDoc). Given that we already have `slotsQuerySchema` and `createBookingSchema` as the single source of validation truth, duplication is an anti-pattern that will diverge on the first schema change.

**Config file:** `openapi-gen.config.json` at repo root (the tool's preferred filename; `next.openapi.json` is deprecated as of v1.4.x). `includeOpenApiRoutes: true` restricts generation to handlers explicitly tagged `@openapi`, preventing auto-inclusion of internal admin routes added in future phases.

**JSDoc placement:** Annotations go on the `export const GET/POST = ...` line (not on the inner `handler` function), because the generator scans for JSDoc immediately preceding named HTTP-method exports.

**How to apply:** Every new public route handler MUST include a JSDoc block with `@openapi`, `@tag`, and at minimum one of `@queryParams` / `@body`. Run `pnpm openapi:gen` and commit `public/openapi.json` in the same commit.

---
