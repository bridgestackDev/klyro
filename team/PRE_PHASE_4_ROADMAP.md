# Pre-Phase 4 Roadmap

Three short phases to run before Phase 4 (Messaging Engine):

1. **Phase 3 — Block E** (close E2E coverage on the booking flow)
2. **Phase 3.5 — API Documentation** (OpenAPI + Swagger UI + Postman collection)
3. **Phase 4 — Pre-flight checkpoint** (verify WhatsApp Cloud API readiness before coding)

Each phase follows the standard block pattern from `CLAUDE_CODE_WORKFLOW.md`. One session, one commit, stop and report.

---

# Phase 3 — Block E (E2E + Vertical Coverage)

**Goal:** Cover the public booking flow end-to-end with Playwright so any future regression is caught automatically. This is the last block of Phase 3.

**Branch:** continue on the Phase 3 branch (do not open a new one).

## What to build

`tests/e2e/booking-barbershop.spec.ts` — full happy path:

1. Seed a barbershop business with 1 branch, 1 staff, 2 services, M–F availability 09:00–18:00.
2. Navigate to `/[locale]/[businessSlug]/[branchSlug]/[staffSlug]`.
3. Pick a service.
4. Pick a date (next valid weekday).
5. Pick a slot.
6. Fill the form (name + WhatsApp).
7. Submit.
8. Assert confirmation screen shows a `KLY-XXXX` code.
9. Assert the `appointments` row exists in the DB with the correct `business_id`, `staff_id`, `service_id`, and a non-null `booking_code`.

`tests/e2e/booking-fitness.spec.ts` — vertical coverage check:

Same shape, but the seeded business is a `fitness` vertical. Assertions:

- The UI uses "sesión" instead of "cita".
- The CTA says "Reservar con [name]" but the success copy uses the fitness `appointmentNoun`.
- The booking code is generated the same way regardless of vertical.

Both tests confirm the booking flow is truly vertical-agnostic, not just type-checked as such.

`tests/e2e/helpers/seed.ts`:

- `seedBusiness({ vertical, ...overrides })` — creates a full business in one transaction using the admin client.
- `cleanupBusiness(slug)` — deletes the test business and cascades.
- Run cleanup in `afterEach` so tests are isolated.

`tests/e2e/helpers/pages.ts` — minimal POM (page-object model) for the booking page: `selectService(name)`, `selectDate(date)`, `selectSlot(time)`, `fillClient({name, phone})`, `submit()`, `getBookingCode()`.

`playwright.config.ts` updates:

- `baseURL` from env (`PLAYWRIGHT_BASE_URL`, default `http://localhost:3000`).
- `webServer` block to launch `pnpm dev` automatically when running locally.
- Set `retries: 1` for CI, `retries: 0` locally.
- `use.locale: 'es-HN'` so the default locale matches production.
- Headless by default, headed via `pnpm test:e2e:headed`.

`.github/workflows/ci.yml` update:

- Add an `e2e` job that runs after typecheck/lint/test.
- Installs Playwright browsers via cache.
- Boots a Supabase test branch (or skips e2e if the branch isn't configured) — document the env var in `.env.example`.

`package.json` scripts:

- `test:e2e` — `playwright test`
- `test:e2e:ui` — `playwright test --ui`
- `test:e2e:headed` — `playwright test --headed`

## i18n

No new keys. E2E tests should read from `es.json` / `en.json` for assertion strings, not hardcode them. Use `getMessages({ locale })` from `next-intl` helpers if available, otherwise read the JSON directly.

## Docs

- `STATUS.md` — mark Phase 3 ✅ Done; add retro paragraph (what worked, what was hard, what to revisit).
- `TASKS.md` — check off all Block E items.
- `DECISIONS.md` — ADR-021 documenting the seed helper pattern (admin client in tests is OK; production code never uses admin client outside `wizard.ts`).

## Validation

- `pnpm typecheck && pnpm lint && pnpm test` — all green.
- `pnpm test:e2e` — both specs green (locally first, CI second).

## Commit

```
feat(phase-3-block-e): E2E coverage for public booking flow

Add Playwright specs for barbershop and fitness verticals. Both
walk the full booking flow end-to-end (service → date → slot →
form → submit → confirmation) and assert the appointment + booking
code land in the DB. Add seed/cleanup helpers and minimal POM.

Wire e2e into CI behind a Supabase test branch env var.

Refs: TASKS.md Phase 3 / Block E
ADR-021: admin client allowed in test seed helpers
```

Tag: `git tag phase-3-done` after the commit. Stop and report.

---

# Phase 3.5 — API Documentation (OpenAPI + Swagger UI + Postman)

**Goal:** Generate an OpenAPI 3.1 spec from the existing API routes, serve it via Swagger UI at `/api-docs` (dev-only), and export a Postman collection. This is **two small blocks**, not three — keep it tight.

**Branch:** `feature/api-docs` off `development`.

**Why now:** there are only 2 routes today (`/api/booking/slots`, `/api/booking/create`). Each new phase will add more. Adding the docs infrastructure now means every future endpoint gets documentation for free. Doing it in Phase 7 means manually documenting 20+ endpoints retroactively.

## Block A — OpenAPI Spec Generation

**Package to install:** `next-openapi-gen@latest` (as a dev dep — it's a code generator, not runtime).

Why this one over alternatives:
- Reads Zod schemas directly (we already have `src/lib/schemas/booking.ts` and others).
- Supports OpenAPI 3.1 (latest stable, Postman-compatible).
- Built-in UI scaffolding for Swagger UI / Scalar / Redoc.
- Active maintenance in 2026.

Configuration file: `openapi.config.ts` at repo root:

```ts
export default {
  apiDir: 'src/app/api',
  schemaDir: 'src/lib/schemas',
  outputFile: 'public/openapi.json',
  spec: {
    openapi: '3.1.0',
    info: {
      title: 'Klyro API',
      version: '0.1.0',
      description: 'Public scheduling API for the Klyro platform.',
    },
    servers: [
      { url: 'https://klyro.app', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local dev' },
    ],
  },
};
```

Annotate each route handler with JSDoc tags that `next-openapi-gen` reads:

```ts
/**
 * @openapi
 * GET /api/booking/slots
 * @summary List available slots for a staff member on a date
 * @tag Booking (Public)
 * @query slotsQuerySchema
 * @response 200 { ...HATEOAS shape... }
 * @response 400 ValidationError
 * @response 429 RateLimited
 */
export async function GET(req: NextRequest) { ... }
```

Apply this annotation pattern to **both** existing endpoints (`/api/booking/slots`, `/api/booking/create`). Reuse the existing Zod schemas — do not redefine them.

`package.json` script:

```
"openapi:gen": "next-openapi-gen"
```

Run it locally, commit `public/openapi.json`. Add this file to the **generated artifacts** list in `.gitignore`'s "Do NOT ignore" section — we want the spec versioned so reviewers see API changes in PRs.

## Block B — Swagger UI + Postman Export

**Package:** `swagger-ui-react@latest`

`src/app/api-docs/page.tsx`:

```tsx
// dev-only Swagger UI mounted at /api-docs
// Refuses to render in production via env check
```

- `'use client'` (swagger-ui-react requires browser).
- Reads `/openapi.json` (the file generated in Block A).
- Returns `notFound()` if `process.env.NODE_ENV === 'production'`.
- Apply Klyro brand styles: dark surface, violet accent on operation buttons. Use a single `<style>` block scoped to the page; do not modify the swagger-ui-react CSS file directly.

Add to `middleware.ts`: explicitly allow `/api-docs` in the public-path set so it doesn't redirect to login.

**Postman collection generation:**

Postman imports OpenAPI 3.1 natively. To make this one-click for everyone on the team:

`docs/postman.md`:

```markdown
# Importing the Klyro API into Postman

1. Open Postman → File → Import.
2. Paste this URL: http://localhost:3000/openapi.json
   (or for production: https://klyro.app/openapi.json)
3. Postman will create a "Klyro API" collection with all endpoints.
4. For authenticated endpoints, set the `Authorization` header to a valid
   Supabase JWT (get one from your browser dev tools → Application → Cookies).
```

Also add an `examples/` folder with Postman environments:

`docs/postman/klyro-local.postman_environment.json`:

```json
{
  "name": "Klyro Local",
  "values": [
    { "key": "baseUrl", "value": "http://localhost:3000" },
    { "key": "supabaseJwt", "value": "", "type": "secret" }
  ]
}
```

`docs/postman/klyro-staging.postman_environment.json` — same shape, `baseUrl` pointing to staging.

## i18n

None — Swagger UI is dev-only and English-only by convention.

## Tests

- `tests/api-docs.test.ts` — smoke test that `/openapi.json` is valid OpenAPI 3.1 (use `@apidevtools/swagger-parser` validation, or a hand-rolled minimal validator).
- `tests/api-docs.test.ts` — assert `/api-docs` route returns 404 when `NODE_ENV === 'production'`.

## Docs

- `STATUS.md` — add Phase 3.5 section.
- `TASKS.md` — add Phase 3.5 with both blocks.
- `DECISIONS.md` — ADR-022 (`next-openapi-gen` over `next-swagger-doc` because Zod-native), ADR-023 (Swagger UI dev-only — production hides internals).
- `CLAUDE.md` — add a line in REST API Conventions: "Every new route handler MUST include a `@openapi` JSDoc block. Run `pnpm openapi:gen` and commit `public/openapi.json` as part of the same commit."

## Validation

- `pnpm openapi:gen` — runs cleanly, produces `public/openapi.json`.
- Open `http://localhost:3000/api-docs` in browser — both endpoints render, "Try it out" works against local API.
- `pnpm typecheck && pnpm lint && pnpm test` — all green.

## Commits

**Block A commit:**

```
feat(phase-3.5-block-a): generate OpenAPI 3.1 spec from API routes

Add next-openapi-gen with Zod-native schema introspection. Annotate
both booking endpoints with @openapi JSDoc blocks. Generate spec to
public/openapi.json (committed for reviewer visibility).

Refs: TASKS.md Phase 3.5 / Block A
ADR-022: next-openapi-gen over next-swagger-doc
```

**Block B commit:**

```
feat(phase-3.5-block-b): Swagger UI at /api-docs + Postman setup

Add swagger-ui-react mounted at /api-docs (dev-only, 404 in
production). Style with Klyro tokens. Add docs/postman.md with
import instructions and two Postman environments (local, staging).

Refs: TASKS.md Phase 3.5 / Block B
ADR-023: Swagger UI dev-only
```

Tag: `git tag phase-3.5-done`. Stop and report.

## Out of scope

- Authenticated endpoint documentation flow (those come in Phase 5).
- API versioning (we're at v0; versioning is a Phase 7+ concern).
- Public-facing API docs at `klyro.app/api-docs` for external developers — that's a marketing decision for post-MVP.

---

# Phase 4 — Pre-flight Checkpoint (NOT a coding phase)

**Goal:** Verify all external dependencies for Phase 4 are in place before writing any code. This is a research + setup session, not a coding session. **Skip if all checkmarks are already green.**

**No branch needed.** Outputs are docs and checklist items.

## What to verify

1. **WhatsApp Cloud API access**
   - Meta Business Manager account created.
   - WhatsApp Business Account (WABA) linked.
   - Phone number registered (test number is OK for dev; production number needs verification — 1–7 business days).
   - `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` obtained.
   - Webhook endpoint URL reserved (will be `https://klyro.app/api/webhooks/whatsapp`).

2. **Template approval pipeline**
   - List of templates to submit (from the 84 seeded in DB — but only the ones we'll actually send: confirmation, reminder_24h, cancellation).
   - For each: Spanish + English variants registered in Meta Business Manager.
   - Approval lead time documented in `STATUS.md`: typically 24–72 hours, can be 5+ days during reviews.
   - **Decision:** which 6 templates do we submit first (3 message types × 2 languages × 1 vertical to start with)? Recommend starting with `barbershop` since it's the wedge.

3. **Pricing confirmation**
   - Verify current WhatsApp Cloud API pricing for Honduras and target markets.
   - Document expected monthly cost for 10 pioneer businesses × ~100 conversations/month each.
   - Update budget in `Klyro_Technical_PRD.md` §2.8 if numbers have shifted.

4. **Resend email setup**
   - Domain `klyro.app` verified in Resend dashboard.
   - DNS records configured (SPF, DKIM, DMARC) at Cloudflare.
   - `RESEND_API_KEY` in `.env.example` (already done) and in production env vars.

5. **Sentry on Edge Functions**
   - Confirm Sentry captures errors in Supabase Edge Functions (separate from Next.js Sentry).
   - If not, document the workaround (manual `fetch` to Sentry's HTTP ingest).

6. **pg_cron job confirmed running**
   - Already scheduled (`dispatch-due-messages` every 5 min).
   - Add a dummy message and confirm it gets picked up in <10 min. This proves the cron → Edge Function path works **before** Phase 4 builds the actual sender.

## Output

A new file `PHASE_4_PREFLIGHT.md` at the repo root containing:

- ✅ / ⬜ checklist of all 6 items above.
- For each item: who's responsible, deadline, and links to relevant Meta / Resend dashboards.
- A "GO / NO-GO" section at the bottom — Phase 4 cannot start until this file has zero ⬜.

Also update `STATUS.md`:

- Phase 4 row: status stays "⬜ Not started", but add a note "blocked on PHASE_4_PREFLIGHT.md".

## No commit needed

This is a doc-only deliverable. Either commit `PHASE_4_PREFLIGHT.md` as a `docs:` commit, or maintain it as a live working document outside git. Recommendation: commit it; checklist progress is useful to track.

## Why this exists

In Phase 4 you'll be tempted to start coding the MessageRouter immediately. If WhatsApp templates aren't approved yet, you'll hit a wall mid-phase. Doing this 1-hour checkpoint up front saves 1–5 business days of waiting later.

---

# Order of execution

```
Day 1:  Phase 3 / Block E      → tag phase-3-done
Day 2:  Phase 3.5 / Block A    → commit
Day 3:  Phase 3.5 / Block B    → tag phase-3.5-done
Day 4:  Phase 4 preflight     → produce checklist
        (wait for template approvals to start)
Day 5+: Phase 4 / Block A     → MessageRouter
```

Total time before Phase 4 coding starts: ~3 working days + waiting for Meta.
