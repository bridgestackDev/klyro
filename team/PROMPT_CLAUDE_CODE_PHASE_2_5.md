# Claude Code Prompt — Phase 2.5: Hardening & Localization

**Project:** Klyro
**Phase:** 2.5 — Hardening & Localization (pre-Phase 3 prep)
**Prerequisites:** Phases 0, 1, 2 complete ✅
**Spec:** `Klyro_Technical_PRD.md` v2.0 — Sections 6, 9, 10, 11
**Workflow rules:** `CLAUDE_CODE_WORKFLOW.md`

---

## Why this phase exists

Phase 3 (Public Booking Flow) exposes the first public, unauthenticated endpoints in Klyro. Before that, the codebase needs four guarantees in place: errors are handled consistently, public input is validated and rate-limited, output is localized correctly per country/currency, and the wizard journey is protected by an E2E test so any future regression is caught immediately.

If we put these in *after* Phase 3, we retrofit. Doing it now means Phase 3 inherits them for free, and Phase 2's wizard benefits retroactively without breaking anything that already ships.

This is NOT the Owner Dashboard. The dashboard belongs in Phase 5, where it can render real data produced by Phases 3 and 4.

---

## 🚀 PROMPT

Paste the block below into Claude Code from the `klyro/` repo root. `Klyro_Technical_PRD.md`, `STATUS.md`, `TASKS.md`, and `CLAUDE_CODE_WORKFLOW.md` must be reachable.

```
You are continuing the Klyro build. Phases 0, 1, and 2 are complete (see STATUS.md). You are now executing Phase 2.5 — Hardening & Localization, a pre-Phase 3 prep phase. The full spec is Klyro_Technical_PRD.md; the workflow rules are CLAUDE_CODE_WORKFLOW.md; this prompt is the execution plan.

CRITICAL RULES (from CLAUDE_CODE_WORKFLOW.md — these apply every block):
1. Klyro_Technical_PRD.md is the single source of truth. If unclear, ASK before guessing.
2. Build block by block in the order below. Do NOT skip ahead. Do NOT mix blocks.
3. After each block: typecheck + lint + test must all pass before you commit.
4. After each block: STOP and report. Wait for my approval before starting the next.
5. Use @latest for new deps. The lockfile is the source of truth.
6. Apply Klyro brand tokens and <Logo /> component. Never hardcode colors.
7. Never touch RLS-protected data without going through the authed Supabase server client.
8. Update STATUS.md and TASKS.md as part of every commit.
9. If you discover a non-obvious decision during a block, append it to DECISIONS.md in the same commit.
10. NEVER push. Local commits only.

================================================================
PHASE 2.5 OVERVIEW
================================================================

Goal: harden the codebase so Phase 3's public endpoints inherit correct error handling, validation, rate limiting, localization, and observability — and verify Phase 2's wizard still works end-to-end after all changes.

Scope of this phase (locked):
- A unified error model and global error handler usable by every route, server action, and React boundary.
- A phone validation library wrapper using libphonenumber-js (already in stack).
- Rate limiting infrastructure ready to apply to public endpoints — Upstash Redis as the provider, in-memory fallback for dev.
- Country / currency catalog covering Honduras + 6 LATAM countries.
- Locale-aware formatters (currency, date, time, phone).
- Structured logging (pino).
- An E2E Playwright test that completes the wizard end-to-end for at least the barbershop vertical.
- Retroactive application of all of the above to the existing wizard code without breaking it.

Explicitly OUT of scope for this phase:
- Owner Dashboard (Phase 5).
- Public booking pages, routes, or UI (Phase 3).
- Messaging engine, WhatsApp integration, email templates (Phase 4).
- Multi-currency within one business (PRD §14 out of scope).
- GDPR (PRD post-MVP).
- AES-256-GCM encryption of at-rest sensitive fields (deferred until payments exist).
- Adding languages beyond ES + EN.

If any of the above out-of-scope items come up while implementing, STOP and ask — do not silently expand scope.

================================================================
NEW DEPENDENCIES THIS PHASE WILL ADD
================================================================

  pnpm add @upstash/ratelimit@latest @upstash/redis@latest pino@latest pino-pretty@latest
  pnpm add -D @playwright/test@latest    # if not already installed from Phase 0

Confirm each version pins into pnpm-lock.yaml. No other deps should be added without explicit approval.

================================================================
NEW ENV VARS THIS PHASE WILL ADD
================================================================

Append to .env.example with empty values + comments:

  # ── Rate limiting (Upstash Redis) ─────────────
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=

  # ── Logging ──────────────────────────────────
  LOG_LEVEL=info        # trace | debug | info | warn | error | fatal
  LOG_PRETTY=true       # set to false in production

Add these to the Zod schema in src/lib/env.ts. UPSTASH_* may be empty in dev — the rate limiter falls back to in-memory.

================================================================
FOLDER STRUCTURE — NEW FILES THIS PHASE
================================================================

src/
├── lib/
│   ├── errors/
│   │   ├── api-error.ts          ApiError class + error code enum
│   │   ├── to-response.ts        toErrorResponse(error) → NextResponse
│   │   └── index.ts              barrel
│   ├── validation/
│   │   ├── phone.ts              libphonenumber-js wrapper: validate, normalize, format
│   │   ├── slug.ts               slug rules (already partially exists — consolidate here)
│   │   └── index.ts              barrel
│   ├── rate-limit/
│   │   ├── client.ts             Upstash client + in-memory fallback
│   │   ├── limiters.ts           pre-defined limiters: booking, slug-check, auth, generic
│   │   └── index.ts              barrel
│   ├── i18n/
│   │   └── countries.ts          country catalog (code, name, currency, dialCode, timezone, locale)
│   ├── format/
│   │   ├── currency.ts           formatCurrency(amount, currency, locale)
│   │   ├── date.ts               formatDate, formatTime, formatDateTime (uses date-fns + locale)
│   │   ├── phone.ts              formatPhoneE164, formatPhoneDisplay
│   │   └── index.ts              barrel
│   └── log/
│       ├── logger.ts             pino instance, child logger factory
│       └── index.ts              barrel
└── app/
    └── [locale]/
        ├── error.tsx             global error boundary (Klyro-branded)
        ├── not-found.tsx         404 page (Klyro-branded)
        └── (existing routes — no new ones in this phase)

tests/
└── e2e/
    └── wizard.spec.ts            new — full wizard journey for barbershop vertical

================================================================
BLOCK A — ERROR MODEL & GLOBAL HANDLER
================================================================

Goal: one ApiError class, one toErrorResponse helper, branded error.tsx and not-found.tsx. Every existing route handler and server action migrates to use them.

A1. src/lib/errors/api-error.ts:
    - ApiError class with: code (string enum), status (HTTP), message (user-facing, i18n key or plain string), fieldErrors? (Record<string, string>), cause? (Error)
    - Error code enum (export as const object):
        UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_FAILED,
        SLUG_TAKEN, RATE_LIMITED, INTERNAL, BAD_REQUEST, CONFLICT
    - Static factories: ApiError.unauthorized(), ApiError.notFound(resource), ApiError.validation(fieldErrors), ApiError.slugTaken(slug), ApiError.rateLimited(retryAfterSeconds), ApiError.internal(cause)

A2. src/lib/errors/to-response.ts:
    - toErrorResponse(error: unknown): NextResponse
    - Maps ApiError → status + JSON body { code, message, fieldErrors? }
    - Maps ZodError → 400 with fieldErrors derived from .flatten()
    - Maps PostgrestError → checks .code (23505 → slugTaken, etc.)
    - Anything else → 500 with code INTERNAL, logs full error, returns generic message
    - Always sets X-Request-ID header for traceability

A3. src/app/[locale]/error.tsx:
    - Next.js error boundary (must be "use client")
    - Renders <Logo variant="mark" /> + i18n error message + "Volver" CTA
    - Logs to Sentry via the existing wiring
    - Uses --color-bg-base background, brand-styled

A4. src/app/[locale]/not-found.tsx:
    - 404 page with cat mark, "Página no encontrada" / "Page not found", link back to home
    - Branded consistently

A5. Migrate existing server actions in src/lib/actions/auth.ts and src/lib/actions/wizard.ts:
    - Replace any ad-hoc error throwing with ApiError.*
    - Wrap each action body with try/catch that returns toErrorResponse output OR re-throws ApiError to be caught by the calling component
    - Do NOT change the action signatures — only the error shape

A6. Add i18n keys for error messages in src/i18n/locales/{es,en}.json under `errors.*`:
    - errors.unauthorized, errors.forbidden, errors.notFound, errors.validationFailed,
      errors.slugTaken, errors.rateLimited, errors.internal, errors.badRequest, errors.conflict
    - Plus errors.boundary.title, errors.boundary.body, errors.boundary.cta
    - Plus errors.notFound.title, errors.notFound.body, errors.notFound.cta

A7. Unit tests (vitest) in src/lib/errors/__tests__/:
    - ApiError factory shapes
    - toErrorResponse maps ZodError correctly
    - toErrorResponse maps PostgrestError 23505 to slugTaken
    - Unknown errors become INTERNAL with logged cause

EXIT CRITERION FOR BLOCK A:
  ✅ All wizard server actions throw/return ApiError consistently
  ✅ /es/anything-broken renders the branded error boundary
  ✅ /es/this-does-not-exist renders the branded 404
  ✅ Unit tests pass
  ✅ pnpm typecheck + lint + test all green
  ✅ Single commit: "feat(phase-2.5-block-a): unified error model and global handler"
  ✅ STATUS.md + TASKS.md updated

STOP and report. Wait for my approval.

================================================================
BLOCK B — VALIDATION + COUNTRY CATALOG + FORMATTERS
================================================================

Goal: a single place for phone validation, a country/currency catalog covering Honduras + LATAM, and locale-aware formatter utilities. Wizard step 7 (messaging — WhatsApp number) migrates to use them.

B1. src/lib/validation/phone.ts (wrapping libphonenumber-js):
    - validatePhone(input: string, countryCode: string): { ok: true, e164: string } | { ok: false, code: 'INVALID' | 'WRONG_COUNTRY' }
    - normalizePhone(input: string, countryCode: string): string | null  (returns E.164 or null)
    - isValidWhatsAppNumber(input: string, countryCode: string): boolean
    - All functions accept a default country fallback from businesses.country

B2. src/lib/validation/slug.ts:
    - Consolidate any existing slug logic (the wizard has some inline)
    - Exports: SLUG_REGEX (/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/), slugify(input), isValidSlug(input)

B3. src/lib/i18n/countries.ts:
    - Export COUNTRIES as a const object keyed by ISO code:
        HN: { name: 'Honduras',     currency: 'HNL', dialCode: '+504', timezone: 'America/Tegucigalpa', locale: 'es-HN' },
        SV: { name: 'El Salvador',  currency: 'USD', dialCode: '+503', timezone: 'America/El_Salvador', locale: 'es-SV' },
        GT: { name: 'Guatemala',    currency: 'GTQ', dialCode: '+502', timezone: 'America/Guatemala', locale: 'es-GT' },
        NI: { name: 'Nicaragua',    currency: 'NIO', dialCode: '+505', timezone: 'America/Managua', locale: 'es-NI' },
        CR: { name: 'Costa Rica',   currency: 'CRC', dialCode: '+506', timezone: 'America/Costa_Rica', locale: 'es-CR' },
        MX: { name: 'México',       currency: 'MXN', dialCode: '+52',  timezone: 'America/Mexico_City', locale: 'es-MX' },
        CO: { name: 'Colombia',     currency: 'COP', dialCode: '+57',  timezone: 'America/Bogota', locale: 'es-CO' },
        US: { name: 'United States', currency: 'USD', dialCode: '+1',   timezone: 'America/New_York', locale: 'en-US' }
    - Exports: COUNTRY_CODES type, getCountry(code), DEFAULT_COUNTRY = 'HN'

B4. src/lib/format/currency.ts:
    - formatCurrency(amount: number, currency: string, locale: string): string
    - Uses Intl.NumberFormat with { style: 'currency', currency }
    - Handles HNL (Honduras Lempira) symbol L correctly

B5. src/lib/format/date.ts:
    - formatDate(date: Date | string, locale: string): string                — Mon, 19 May
    - formatTime(date: Date | string, locale: string): string                — 3:30 PM / 15:30 depending on locale
    - formatDateTime(date: Date | string, locale: string): string
    - formatRelative(date: Date | string, locale: string, now?: Date): string — "en 2 horas", "ayer"
    - All built on date-fns + the matching locale import

B6. src/lib/format/phone.ts:
    - formatPhoneE164(input: string, country: string): string | null
    - formatPhoneDisplay(input: string, country: string): string | null      — national format with spaces

B7. Wizard migration (retroactive):
    - Step 3 (branch info — phone field): use validatePhone + countries dialCode for default
    - Step 5 (staff): no phone field today; skip
    - Step 7 (messaging — WhatsApp): use validatePhone, store E.164, display formatted
    - Step 8 (booking link preview) and Step 9 (review): use formatCurrency for service prices, formatPhoneDisplay for phones
    - Service catalog rows in Step 4: prices displayed via formatCurrency

B8. Unit tests:
    - validatePhone happy + invalid + wrong-country cases for HN, MX, US
    - getCountry returns correct shape; unknown code returns undefined
    - formatCurrency for HNL, USD, MXN
    - formatDate / formatTime for es-HN and en-US

EXIT CRITERION FOR BLOCK B:
  ✅ Wizard's phone fields validate against the selected country
  ✅ Wizard's service price displays format per currency (HNL → L 250.00)
  ✅ countries catalog imports cleanly and is type-safe
  ✅ Unit tests pass
  ✅ pnpm typecheck + lint + test all green
  ✅ Single commit: "feat(phase-2.5-block-b): validation, country catalog, locale formatters"
  ✅ STATUS.md + TASKS.md updated

STOP and report. Wait for my approval.

================================================================
BLOCK C — RATE LIMITING INFRASTRUCTURE
================================================================

Goal: Upstash-backed rate limiter ready to drop in front of public endpoints in Phase 3. In-memory fallback when UPSTASH_* env vars are empty (dev experience).

C1. src/lib/rate-limit/client.ts:
    - Reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN from env
    - If present: instantiates @upstash/redis client
    - If absent (dev): returns an in-memory shim with the same interface (Map-based, per-process)
    - Log which mode is active on startup (single line, info level)

C2. src/lib/rate-limit/limiters.ts:
    - Pre-defined limiters using @upstash/ratelimit with sliding window:
        booking      : 10 req / 1 min   per IP+businessId  (will apply to POST /api/booking/create in Phase 3)
        slug-check   : 30 req / 1 min   per IP              (already used in wizard B2)
        auth         : 5 req / 5 min    per IP              (login attempts)
        generic      : 60 req / 1 min   per IP              (catch-all for new endpoints)
    - Export helper: limit(name, key) → { success, remaining, reset, retryAfter }
    - On limit hit: returns { success: false, retryAfter: seconds }

C3. Apply slug-check limiter to existing endpoint (or server action) that checks slug availability:
    - Look at wizard server actions; the slug-check call (used in Step 2) should call limit('slug-check', ip)
    - On limit hit: throw ApiError.rateLimited(retryAfter)

C4. src/middleware.ts:
    - No global rate limiting yet — only opt-in via the limiters above
    - But: add an X-Forwarded-For → req-scoped ip helper exported from src/lib/rate-limit/get-ip.ts so handlers can do `const ip = getIp(request)`

C5. Unit tests:
    - In-memory limiter respects the configured window
    - Multiple keys are independent
    - Upstash mode is exercised via a mocked client

C6. Documentation:
    - Add a short "Rate limiting" subsection to README.md explaining the two modes and how to test in dev (env unset = in-memory)

EXIT CRITERION FOR BLOCK C:
  ✅ Rate limiter works in both modes (test by toggling env vars locally)
  ✅ Slug-check endpoint denies the 31st request inside a 1-min window
  ✅ Unit tests pass
  ✅ README updated
  ✅ pnpm typecheck + lint + test all green
  ✅ Single commit: "feat(phase-2.5-block-c): rate limiting infrastructure (Upstash + in-memory fallback)"
  ✅ STATUS.md + TASKS.md updated

STOP and report. Wait for my approval.

================================================================
BLOCK D — STRUCTURED LOGGING
================================================================

Goal: pino-based logger usable in route handlers, server actions, edge runtime, and Edge Functions. Replaces all console.log calls in the existing codebase.

D1. src/lib/log/logger.ts:
    - Create the base pino instance using LOG_LEVEL + LOG_PRETTY env
    - In dev: pino-pretty transport, colored output
    - In prod: JSON output to stdout (Vercel + Supabase Edge both ingest this)
    - Export logger (root) + makeLogger(scope: string) for child loggers
    - Never log PII (no full phone numbers, no emails — log truncated/hashed if needed)

D2. Replace existing console.log/error/warn usage:
    - grep the repo for console.log / console.error / console.warn
    - Replace with logger calls of appropriate level
    - Keep console.error in error.tsx (client component — pino doesn't run in the browser)

D3. Add request logging to API routes (not middleware — request logger is per-handler):
    - For each existing route handler, add a small `withLogging` wrapper that logs { method, path, status, durationMs } on completion
    - The toErrorResponse helper (block A) ALSO logs errors with full context

D4. Configure Sentry breadcrumbs:
    - Pino logs at warn+ also get attached as Sentry breadcrumbs so error reports have context

D5. Unit tests:
    - logger.info doesn't throw in any runtime
    - PII redaction works (test with a sample object containing { phone: '+50412345678' } and verify the output is truncated)

EXIT CRITERION FOR BLOCK D:
  ✅ No more console.log in src/ (except client error.tsx — documented)
  ✅ Dev terminal shows pretty pino output
  ✅ Sentry breadcrumbs include recent warn+ logs
  ✅ Unit tests pass
  ✅ pnpm typecheck + lint + test all green
  ✅ Single commit: "feat(phase-2.5-block-d): structured logging with pino"
  ✅ STATUS.md + TASKS.md updated

STOP and report. Wait for my approval.

================================================================
BLOCK E — WIZARD E2E TEST + REGRESSION SAFETY NET
================================================================

Goal: a single Playwright test that exercises the full wizard for the barbershop vertical. Any future regression that breaks setup is caught immediately.

E1. tests/e2e/wizard.spec.ts:
    - Test name: "wizard: barbershop owner completes setup end-to-end"
    - Uses Playwright with a fresh authenticated user (helper: createTestUser, signs in via magic link mock or test-only auth bypass)
    - Walks all 9 steps:
        1. Selects 'barbershop' vertical
        2. Enters business name "Barbería del Centro"; slug auto-fills as "barberia-del-centro"
        3. Enters branch "Sucursal Principal", address, city Tegucigalpa, timezone HN, phone (valid HN E.164)
        4. Confirms pre-seeded services (corte, barba, combo); leaves prices unchanged
        5. Confirms owner-as-staff with display_name + slug
        6. Sets availability Mon–Fri 9:00–18:00, weekend off
        7. Selects WhatsApp channel, enters valid WhatsApp number
        8. Confirms booking link preview
        9. Clicks "Lanzar mi negocio" → expects redirect to /dashboard
    - Asserts on DB state via supabase admin client at the end: business row exists with onboarding_completed=true, branch + services + staff + availability all present
    - Cleanup: deletes the test business + auth user after the test

E2. tests/e2e/helpers/:
    - create-test-user.ts (creates auth user + cleans up)
    - test-db.ts (admin Supabase client for assertions)
    - wizard-page.ts (Playwright Page Object Model for the wizard)

E3. playwright.config.ts:
    - If not already configured, add config: baseURL http://localhost:3000, headless in CI, retries: 2 in CI, projects: chromium
    - Webserver auto-start: `pnpm dev` if not running

E4. CI integration:
    - Update .github/workflows/ci.yml to run pnpm test:e2e on every PR
    - Cache Playwright browsers
    - Upload trace + screenshots as artifacts on failure

E5. package.json scripts:
    - "test:e2e": "playwright test"
    - "test:e2e:ui": "playwright test --ui"
    - "test:e2e:install": "playwright install --with-deps chromium"

EXIT CRITERION FOR BLOCK E:
  ✅ pnpm test:e2e passes locally (clean run from a fresh DB state)
  ✅ Test exercises all 9 wizard steps + asserts DB state
  ✅ CI runs the E2E test on every PR
  ✅ pnpm typecheck + lint + test (unit) + test:e2e all green
  ✅ Single commit: "test(phase-2.5-block-e): e2e wizard journey for barbershop vertical"
  ✅ STATUS.md + TASKS.md updated, phase 2.5 marked ✅

STOP and report. Wait for my approval.

================================================================
PHASE 2.5 DEFINITION OF DONE
================================================================
  ✅ ApiError + toErrorResponse used across all routes and actions
  ✅ Branded error.tsx + not-found.tsx render correctly
  ✅ Phone validation works for HN + MX + US via libphonenumber-js wrapper
  ✅ Country catalog covers HN + 6 LATAM + US
  ✅ formatCurrency / formatDate / formatTime / formatPhone work per locale
  ✅ Rate limiter operational in both Upstash and in-memory modes
  ✅ Slug-check endpoint rate-limited
  ✅ Structured pino logging in place; no stray console.log
  ✅ Sentry receives breadcrumbs from warn+ logs
  ✅ Wizard E2E test passes locally and in CI
  ✅ Wizard still works end-to-end manually (no regression from retroactive changes)
  ✅ STATUS.md shows Phase 2.5 complete, "Active phase: Phase 3 next"
  ✅ TASKS.md updated
  ✅ DECISIONS.md has entries for: Upstash choice, pino choice, in-memory fallback design, country list scope
  ✅ git tag phase-2.5-done

================================================================
REPORTING TEMPLATE (use after each block)
================================================================

When you report back after a block, use this template:

  ## Block <X> — <name> — Report

  **Status:** ✅ Done / 🟡 Partial / 🔴 Blocked

  **Files added/changed:**
  - <list>

  **Deps added:**
  - <name@version> — why

  **Decisions made (added to DECISIONS.md):**
  - <decision> — <why>

  **Tests:**
  - pnpm typecheck: <status>
  - pnpm lint: <status>
  - pnpm test: <pass/fail counts>
  - pnpm test:e2e (block E only): <status>

  **Open questions / blockers:**
  - <list or "none">

  **Ready for next block?** Yes / No (explain)

================================================================
START NOW
================================================================
Read Klyro_Technical_PRD.md (Sections 6, 9, 10, 11), STATUS.md, TASKS.md, and CLAUDE_CODE_WORKFLOW.md. Summarize what you understood about Phase 2.5 in 5–8 bullets, then begin BLOCK A.
```

---

## 📋 Notes before you start

1. Have `Klyro_Technical_PRD.md`, `STATUS.md`, `TASKS.md`, and `CLAUDE_CODE_WORKFLOW.md` in the repo root before pasting the prompt.
2. Decide ahead of time whether to provision Upstash Redis or run in-memory only for dev. The block works either way; this just affects whether you can integration-test against real Redis locally.
3. Phase 2.5 is shorter than Phase 2 (5 blocks vs 7) but block E (E2E test) is the highest-value piece. Don't let Claude Code skip it under time pressure — that test is the safety net for every subsequent phase.
4. Expect Phase 2.5 to take ~2–3 days of Claude Code time at a steady pace. Block E is usually the slowest because Playwright setup has fiddly bits.

---

## 🔁 Block-by-block pattern

After each block is approved:

```
Proceed with Block <X> of Phase 2.5 from PROMPT_CLAUDE_CODE_PHASE_2_5.md.

Same rules apply:
- Read the block section first, summarize the plan
- Implement step by step
- Use @latest for any new deps
- Apply Klyro brand tokens and the <Logo /> component
- End with a single commit (do not push)
- Update STATUS.md, TASKS.md, DECISIONS.md as needed
- Report exit criteria using the reporting template
- Wait for my approval before moving on
```
