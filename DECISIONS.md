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

**Decision:** `WizardInner` renders `{isLaunching && <LaunchLoader open ... />}` rather than always rendering `<LaunchLoader open={isLaunching} ... />`.

**Why:** The conditional render causes the component to mount fresh on each launch attempt, automatically resetting `messageIndex` to 0. The alternative (always-mounted with a reset in `useEffect`) would require calling `setState` synchronously inside an effect body, which violates the `react-hooks/set-state-in-effect` lint rule and can cause cascading renders.

---
