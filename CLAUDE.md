# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Workflow

**At the start of every session, before doing anything else, read these files in order:**

1. `CLAUDE_CODE_WORKFLOW.md` — the block pattern, the 10 critical rules, anti-patterns, commit format. These rules apply to every block in every phase.
2. `STATUS.md` — what's done, what's in progress, what's blocked.
3. `TASKS.md` — the checkbox list for the current phase.
4. `DECISIONS.md` — architectural decisions log (ADRs).

If the user's request maps to a phase spec (e.g. `PHASE_2_6_MEDIA.md`), read that too.

Then summarize in 5–8 bullets what you understood about the current block before writing any code. Wait for the user to confirm the summary before proceeding.

**Operating mode for every task:**
- One block per session. One commit per block.
- Run `pnpm typecheck && pnpm lint && pnpm test` before every commit.
- After committing, STOP and report. Do not begin the next block.
- Update `STATUS.md` and `TASKS.md` as part of every commit.
- Append non-obvious decisions to `DECISIONS.md` in the same commit.
- Never push. Local commits only.

## Commands

All commands run from the `klyro/` subdirectory:

```bash
cd klyro
pnpm dev           # start dev server (Next.js with Turbopack)
pnpm build         # production build
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest run (unit + component)
pnpm test:watch    # vitest in watch mode
pnpm test:e2e      # playwright e2e tests
```

**Database migrations:**
```bash
pnpm dlx supabase@latest db push   # push local migrations to remote
pnpm dlx supabase@latest gen types typescript --project-id ouexfehqxpgewzgytjgc > src/types/database.ts
```

**Node:** ≥22 LTS. **Package manager:** pnpm (pinned in `packageManager` field). Never use npm or yarn.

## Architecture Overview

### App structure
The Next.js App Router lives in `klyro/src/app/[locale]/` — every route is locale-prefixed (default `es`, secondary `en`). Three route groups:
- `(auth)/` — login, signup, OAuth callback
- `(dashboard)/` — protected owner/staff views (dashboard, agenda, team, branches, services, settings, links)
- `(booking)/[businessSlug]/[branchSlug]/[staffSlug]/` — public booking flow (Phase 3, not yet built)

### Middleware (`src/middleware.ts`)
Runs on every non-static request. Handles three concerns in order:
1. Supabase session refresh (must run before any auth check)
2. Auth guard — unauthenticated requests to dashboard paths redirect to `/[locale]/login`
3. next-intl locale routing

### Multi-tenant isolation
All business data is scoped by `business_id`. Supabase Row-Level Security (RLS) policies in `supabase/migrations/0002_rls_policies.sql` enforce isolation at the DB level — owners see all of their business, staff see only their own appointments. **RLS is the authorization boundary; there is no separate API auth layer.**

### Vertical registry (`src/lib/verticals/registry.ts`)
The core of the multi-vertical system. Eight verticals (`barbershop`, `salon`, `fitness`, `spa`, `tattoo`, `carwash`, `petgrooming`, `other`) are defined as plain TypeScript objects — not DB enums. Adding a new vertical is a code-only change. The registry drives:
- Wizard defaults (services, durations, buffer time)
- Booking page copy (`appointmentNoun`, `staffNoun`, `serviceNoun` per locale)
- Message template selection by `(vertical, language, channel, type)`

### Database (Supabase project: `ouexfehqxpgewzgytjgc`)
12 tables: `businesses`, `branches`, `users`, `staff`, `staff_branches`, `services`, `branch_services`, `staff_availability`, `clients`, `appointments`, `messages`, `message_templates`. Migrations in `supabase/migrations/`. Types generated into `src/types/database.ts`.

`pg_cron` runs `dispatch-due-messages` every 5 minutes — selects pending messages where `scheduled_at <= now()` and invokes the Edge Function.

### Supabase clients
Three clients, each for a different runtime context:
- `src/lib/supabase/client.ts` — browser (singleton)
- `src/lib/supabase/server.ts` — Server Components and Server Actions (creates a new client per call)
- `src/lib/supabase/middleware.ts` — middleware only

### Auth
Three providers via Supabase Auth: Google OAuth (primary), Apple Sign-In, Magic Link (email). `src/lib/actions/auth.ts` contains server actions for each. The OAuth callback route is `src/app/[locale]/(auth)/callback/route.ts`. A DB trigger (`0005_auth_trigger.sql`) auto-creates a `public.users` row on signup.

### i18n
`next-intl` with `src/i18n/config.ts` and `src/i18n/routing.ts`. All UI strings live in `src/i18n/locales/es.json` and `en.json` — never hardcode display text in components.

### Design system
All color tokens are CSS custom properties defined in `src/app/globals.css` via Tailwind v4 `@theme`. **Never reference hex values or raw colors in components** — always use token names (`bg-violet`, `bg-bg-base`, etc.). Two brand anchors: Klyro Violet `#6D64FB` and Klyro Navy `#14143A`. Dark mode is the default for the dashboard; public booking page may use light tokens.

`src/components/shared/Logo.tsx` is the single source of truth for all logo rendering (three variants: `mark`, `wordmark`, `lockup`). Never use `<img>` for the logo.

shadcn/ui primitives are in `src/components/ui/` and are customized to consume Klyro tokens.

### Env vars
Validated at startup by Zod in `src/lib/env.ts`. Adding a new env var requires updating both `.env.example` and `src/lib/env.ts`. Separate client-safe (`NEXT_PUBLIC_*`) and server-only schemas.

## Build phases (current status)

| Phase | Status |
|-------|--------|
| 0 — Foundation | ✅ Done |
| 1 — Auth & Onboarding Shell | 🟡 Built, needs smoke test |
| 2 — Setup Wizard (12-step) | ⬜ Next up |
| 3 — Public Booking Flow | ⬜ |
| 4 — Messaging Engine | ⬜ |
| 5–8 | ⬜ |

See `STATUS.md` for smoke test checklist and detailed phase notes. See `Klyro_Technical_PRD.md` for the full spec.

## Git Workflow

### Branch naming
- Features: `feature/<task>-<brief-description>`
- Bug fixes: `fix/<task>-<brief-description>`
- Chores: `chore/<brief-description>`

All branches cut from `main`. Never commit directly to `main`.

### Conventional commits
Format: `<type>(<scope>): <imperative summary>`

| Type | When to use |
|------|-------------|
| `feat` | New feature or UI component |
| `fix` | Bug fix |
| `chore` | Deps, config, tooling — no production code |
| `refactor` | Code restructure without behavior change |
| `test` | Add/update tests |
| `docs` | Documentation only |
| `style` | Formatting, whitespace |
| `ci` | CI/CD pipeline changes |

Scopes: `auth` | `wizard` | `booking` | `dashboard` | `db` | `i18n` | `design-system` | `messaging`

Examples:
```
feat(wizard): add step 1 business info form
fix(auth): redirect to correct locale after OAuth callback
chore(deps): bump supabase-js to 2.45
test(wizard): add unit tests for step validation
```

### Atomic commits
One logical change per commit — if reverting it leaves the app in a coherent state, it's atomic. Stage specific files; never `git add .` blindly. Migrations go in their own commit, separate from dependent UI code.

### Pull requests
After completing a task:
1. Push branch: `git push -u origin <branch>`
2. Open PR: `gh pr create` (the repo template auto-populates the body)
3. Reviewers are auto-assigned via CODEOWNERS (`@jmayorga94`, `@jmendezrf`)
4. Merge only after approval — prefer squash-merge to keep `main` history clean

---

## Key constraints

- `businesses.vertical` is a plain `text` field referencing keys in the registry — not a DB enum. Never create a migration to make it an enum.
- Message templates are selected by `(type, channel, language, vertical)` — the unique index on `message_templates` enforces this.
- 84 templates seeded (7 active verticals × 2 channels × 2 languages × 3 message types).
- Dashboard is dark-mode only in v1. No light/dark toggle for the dashboard.
- JetBrains Mono is only for booking confirmation codes. Inter everywhere else.

---

## Testing Requirements

Before marking any task as complete:

1. Write unit tests for new functionality
2. Run the full test suite with: `npm test`
3. If test fail:
   - Analyz the failure output:
   - Fix the code (no the tests, unless tests are incorrect)  
4. For API endpoints, including integration tests that verify:

   - Sucess response with valid input
   - Authentication requirements
   - Edge cases


## REST API Conventions

All route handlers live under `src/app/api/` (locale-independent). Target: **Richardson Maturity Level 3** — Resources + HTTP verbs + HATEOAS links.

### URLs
- Plural nouns: `/api/bookings`, `/api/staff`, `/api/services`
- Nested resources: `/api/branches/:id/staff`
- No verbs in paths — the HTTP method is the verb
- Kebab-case: `/api/booking-slots`

### HTTP methods
`GET` read · `POST` create · `PATCH` partial update · `PUT` full replace · `DELETE` remove

### Status codes
| Code | When |
|------|------|
| `200` | GET / PATCH / PUT succeeded |
| `201` | POST created — add `Location` header |
| `204` | DELETE succeeded |
| `400` | Validation failed |
| `401` | No session |
| `404` | Not found (also use when RLS hides a row) |
| `409` | Conflict (e.g. slot already taken) |
| `500` | Unexpected — log to Sentry, never expose stack trace |

### Response shape

```jsonc
// Single resource
{ "data": { ...resource }, "_links": { "self": { "href": "/api/bookings/123", "method": "GET" } } }

// Collection
{ "data": [...], "meta": { "total": 42, "page": 1, "perPage": 20 }, "_links": { "self": {...}, "next": {...} } }

// Error
{ "error": { "code": "SLOT_TAKEN", "message": "Human-readable reason.", "field": "slotId" } }
```

Never return a naked object or array at the top level.

### HATEOAS `_links`
`self` is always required. Add conditional links for **currently available** actions only — a cancelled booking has no `cancel` link.

```jsonc
"_links": {
  "self":   { "href": "/api/bookings/123", "method": "GET" },
  "cancel": { "href": "/api/bookings/123", "method": "DELETE" },
  "staff":  { "href": "/api/staff/xyz",   "method": "GET" }
}
```

### Validation
Define a Zod schema per route; parse at the top; return `400` + `field` on failure.

```ts
const Schema = z.object({ staffId: z.string().uuid(), slotStart: z.string().datetime() })
const parsed = Schema.safeParse(await req.json())
if (!parsed.success) {
  const e = parsed.error.errors[0]
  return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: e.message, field: e.path.join('.') } }, { status: 400 })
}
```

### Auth & multi-tenancy
- Never accept `business_id` from the client — derive it from the session.
- RLS enforces data isolation; don't add manual `WHERE business_id = X` filters on top.

### Error codes
`UNAUTHORIZED` · `NOT_FOUND` · `VALIDATION_ERROR` · `SLOT_TAKEN` · `BOOKING_CONFLICT` · `INTERNAL_ERROR`

---

## Key constraints

- `businesses.vertical` is a plain `text` field referencing keys in the registry — not a DB enum. Never create a migration to make it an enum.
- Message templates are selected by `(type, channel, language, vertical)` — the unique index on `message_templates` enforces this.
- 84 templates seeded (7 active verticals × 2 channels × 2 languages × 3 message types).
- Dashboard is dark-mode only in v1. No light/dark toggle for the dashboard.
- JetBrains Mono is only for booking confirmation codes. Inter everywhere else.

---
