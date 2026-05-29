<!--
## Sync Impact Report

**Version change**: (template) → 1.0.0
**Initial ratification**: 2026-05-28

### Added Sections
- Core Principles (7 principles — I through VII)
- Performance & Observability Requirements
- Development Workflow & Quality Gates
- Governance

### Modified Principles
- N/A (initial ratification; all principles are new)

### Templates Status
- `.specify/templates/plan-template.md` ✅ — "Constitution Check" gate present; principles align
- `.specify/templates/spec-template.md` ✅ — Functional requirements format aligns with constitution mandates
- `.specify/templates/tasks-template.md` ✅ — Phase structure compatible with quality gate requirements

### Deferred Items
- None. All placeholders resolved.
-->

# Klyro Constitution

## Core Principles

### I. Security-First, Defense-in-Depth

Every layer of the system MUST enforce security independently. Row-Level Security (RLS)
in Postgres is the non-negotiable authorization boundary — not application logic. The
service-role key MUST NEVER appear in client-side code. All external webhook payloads
MUST be signature-validated (Meta `WHATSAPP_APP_SECRET`, Twilio, Resend) before
processing. Public booking endpoints and auth routes MUST enforce rate limiting (Upstash
Redis with passthrough fallback in development). Sessions MUST use httpOnly, Secure,
SameSite=Lax cookies. No PII MAY appear in log output or URL parameters. Sensitive fields
stored outside Supabase Auth's encrypted columns MUST be encrypted at rest with
AES-256-GCM. Security patch releases for Next.js MUST be applied immediately. Weekly
`pnpm outdated` and `pnpm audit` runs are required after launch.

**Rationale**: A single data-isolation failure exposes one business's clients to another.
RLS at the DB layer makes this impossible even in the presence of application bugs. The
system handles personal contact data (names, phone numbers) for end clients who did not
consent to share their data with anyone except the business they booked with.

### II. Multi-Tenant Isolation by Design

Every database table MUST be scoped by `business_id`. RLS policies MUST enforce that
authenticated users can only read and write rows belonging to their own business. Owners
see all data within their business; staff see only their own appointments. The application
layer MUST NEVER derive `business_id` from the client request — it MUST always be derived
from the authenticated session. No manual `WHERE business_id = X` clauses are permitted
in application code; Postgres enforces this transparently on every query.

**Rationale**: Multi-tenancy is a foundational property, not a feature. Building it into
RLS from line one means it cannot regress. A manual `WHERE` clause can be forgotten; an
RLS policy cannot be bypassed by application code.

### III. Vertical-Agnostic Architecture

The platform supports eight appointment verticals (barbershop, salon, fitness, spa,
tattoo, carwash, petgrooming, other) through a code-side registry (`src/lib/verticals/
registry.ts`), not database enums. `businesses.vertical` MUST remain a plain `text`
field. Adding a new vertical MUST require only a code change — no database migration, no
schema modification. All vertical-specific behavior (service defaults, messaging tone,
booking page copy, message template selection) MUST be driven by the `VerticalProfile`
registry entry, never by hardcoded conditionals in components or route handlers. The E2E
test suite MUST cover at least two distinct verticals to catch accidental hardcoding.

**Rationale**: Retrofitting multi-vertical support post-launch is expensive and error-
prone. The registry pattern costs ~10% extra engineering time at the start and unlocks
an order-of-magnitude larger addressable market. Making the vertical field a DB enum would
require a migration for every new vertical — a friction cost that compounds over time.

### IV. Test-Driven Quality Gates (NON-NEGOTIABLE)

Every new feature MUST include tests before it is marked complete. Three layers are
required:
- **Unit (Vitest)**: slot calculation logic, vertical registry resolution, MessageRouter
  template selection, Zod schema validation.
- **Component (Vitest + Testing Library)**: wizard steps, booking form interactions,
  dashboard components that carry business logic.
- **E2E (Playwright)**: full booking journey, including at least two different verticals.

Tests MUST be written before or alongside implementation — never deferred as a follow-up.
The full suite (`pnpm typecheck && pnpm lint && pnpm test`) MUST pass before every commit.
RLS verification MUST be covered by hand-rolled Supabase test scripts for any new policy.

**Rationale**: The first pioneer businesses will form their permanent opinion of Klyro's
reliability on their first booking. A bug in the confirmation flow, the availability
calculation, or the messaging engine is not recoverable. Manual testing at MVP scale is
insufficient; automated coverage is the only sustainable baseline.

### V. Design System Fidelity

All visual styling MUST use CSS custom property tokens defined in `src/app/globals.css`
via Tailwind v4 `@theme`. Raw hex values (`#6D64FB`, `#14143A`, etc.) MUST NEVER appear
in component files — only token names (`bg-violet`, `bg-bg-base`, `text-primary`, etc.).
The `src/components/shared/Logo.tsx` component is the single source of truth for all
brand mark rendering. `<img>` tags MUST NOT be used to render the Klyro logo. The
dashboard is dark-mode only in v1 — no light/dark toggle exists or should be added.
JetBrains Mono is strictly reserved for booking confirmation codes; Inter is used
everywhere else. Focus rings (2px solid `--klyro-violet` with 2px offset) MUST always be
visible — focus outlines MUST NOT be removed.

**Rationale**: All colors live in one file; all logo variants live in one component.
A brand refresh or token adjustment can be applied in minutes without hunting through
component files. WCAG 2.1 AA compliance on the public booking page is a hard requirement
— removing focus rings makes this impossible to achieve.

### VI. Spanish-First Internationalization

Every user-facing string MUST live in `src/i18n/locales/es.json` (Spanish, primary) and
`en.json` (English, secondary). Hardcoded display text in components is prohibited. Locale
detection for the booking page MUST use the client's browser settings. The dashboard MUST
use the owner's preferred language. Date, time, currency, and phone number formatting MUST
be country-aware — not just language-aware. New routes or components that introduce UI
copy MUST include both `es` and `en` translations in the same commit. Message templates
MUST be seeded for both languages across all active verticals.

**Rationale**: Klyro was built bilingual from the first commit. Spanish is the primary
language of the target market; shipping English-only or English-first is a product failure
for LATAM customers. Deferred translations create technical debt that compounds with every
new string added.

### VII. API Consistency at Richardson Level 3

Every public route handler MUST follow Richardson Maturity Level 3 conventions: resources
named as plural nouns, HTTP verbs as actions, HATEOAS `_links` on every response. All
responses MUST use the canonical shape: `{ data, meta?, _links }` for success and
`{ error: { code, message, field? } }` for failure. Naked arrays or objects at the top
level are prohibited. Every new route handler MUST include a `@openapi` JSDoc block, and
`pnpm openapi:gen` MUST be run — committing the updated `public/openapi.json` in the
same commit as the route. Zod schemas MUST be defined per route and parsed at the entry
point. Validation failures MUST return 400 with a `field` pointer. `business_id` MUST
NEVER be accepted from the client — always derive from session.

**Rationale**: Consistent API shape means the Swagger UI, Postman collections, and any
future SDK generation work without per-endpoint special-casing. HATEOAS links make the
API self-documenting for clients. Enforcing the OpenAPI rule at commit time prevents
documentation drift, which becomes expensive to recover from at scale.

## Performance & Observability Requirements

**Response time targets (p95)**:
- Booking slot availability query: < 300ms
- Booking creation (end-to-end, DB write + message queue): < 500ms
- Dashboard appointment list (first load): < 800ms
- Public booking page (Core Web Vitals LCP): < 2.5s

**Observability requirements**:
- All errors in production MUST be captured by Sentry with full context (no stack trace
  exposure to clients).
- No PII (names, phone numbers, email addresses) MAY appear in Sentry payloads or
  structured logs.
- Every outbound message dispatch MUST be logged with `(messageId, channel, status)` —
  without logging the message body.
- Lighthouse score on public booking pages MUST remain above 90 (performance, accessibility,
  best practices, SEO).
- Uptime monitoring via Better Stack; on-call response SLA is defined separately in ops
  documentation.

**Performance constraints**:
- The messaging dispatch (`pg_cron` + Edge Function) MUST complete within the 5-minute
  cron window for the expected volume of pending messages.
- Slot calculation MUST handle 12 months of forward availability without timeout.
- Supabase Free tier is the target environment for closed beta; queries MUST be index-
  supported for the access patterns in `idx_appointments_*` indexes.

## Development Workflow & Quality Gates

**One block per session, one commit per block.** A "block" is one logical unit of work
that leaves the codebase in a coherent, deployable state. After every commit, work STOPS
and status is reported. The next block begins only in the next session.

**Commit gates (in order)**:
1. `pnpm typecheck` — zero TypeScript errors.
2. `pnpm lint` — zero ESLint violations.
3. `pnpm test` — full Vitest suite passes.
4. If a new route was added: `pnpm openapi:gen` run and `public/openapi.json` staged.
5. `STATUS.md` and `TASKS.md` updated to reflect completed work.
6. Non-obvious decisions appended to `DECISIONS.md`.

**Branch naming**:
- Features: `feature/<task>-<brief-description>`
- Bug fixes: `fix/<task>-<brief-description>`
- Chores: `chore/<brief-description>`

All branches are cut from `main`. Direct commits to `main` are prohibited.

**Conventional commit format**: `<type>(<scope>): <imperative summary>`

Valid types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `ci`

Valid scopes: `auth`, `wizard`, `booking`, `dashboard`, `db`, `i18n`, `design-system`,
`messaging`

**Migrations are atomic**: database migrations MUST be committed separately from the
dependent application code. Migrations follow the `supabase/migrations/` naming convention
and are applied via `pnpm dlx supabase@latest db push`.

**No pushing**: local commits only unless explicitly instructed. Push + PR require explicit
user confirmation.

**Phase-gated delivery**: build phases (0 through 8) are sequential. No phase may be
started until the exit criterion of the prior phase is verified. Exit criteria are defined
in `Klyro_Technical_PRD.md` §7 and tracked in `STATUS.md`.

## Governance

This constitution supersedes all other development practices within the Klyro repository.
Where a conflict exists between this document and any other guideline (README, inline
comment, PR description), this constitution takes precedence.

**Amendment procedure**:
1. Any principle or section change requires a draft PR with a written rationale explaining
   what changed and why the current principle is insufficient or incorrect.
2. Both reviewers (`@jmayorga94`, `@jmendezrf`) must approve before merging.
3. `CONSTITUTION_VERSION` MUST be incremented following semantic versioning:
   - MAJOR: backward-incompatible governance change, principle removal, or redefinition
     that invalidates existing implementation decisions.
   - MINOR: new principle or section added, or materially expanded guidance.
   - PATCH: clarification, wording fix, or non-semantic refinement.
4. `LAST_AMENDED_DATE` MUST be updated to the merge date (ISO 8601: YYYY-MM-DD).
5. After a MAJOR or MINOR amendment, run a consistency propagation check across
   `.specify/templates/` to update references.

**Compliance review**: Every PR MUST be checked against the Constitution Check gate in
`plan.md`. Violations that cannot be resolved must be documented in the plan's Complexity
Tracking table with explicit justification. Unexplained violations block merge.

**Runtime guidance**: For session-by-session development conventions, see `CLAUDE.md` and
`CLAUDE_CODE_WORKFLOW.md`. Those documents implement the workflow rules established here.

---

**Version**: 1.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-28
