# Klyro — Tech Stack

**Version:** 1.0
**Date:** May 2026
**Audience:** Technical advisors, security reviewers, future engineering hires, integration partners

> This document summarizes the technical choices behind Klyro. For full implementation specification, see `Klyro_Technical_PRD.md`. For current build status, see `STATUS.md`.

---

## Philosophy

Three principles drive every technical decision at Klyro.

**Lean by default.** We pick boring, well-supported technologies over novel ones. We use one solution per concern, not three. We delete more than we add.

**Owned where it matters, rented where it doesn't.** The data model, the authorization boundary, and the messaging abstraction are ours and live in the repo. Authentication, storage, real-time, and email delivery are rented from best-in-class providers, because building those well takes thousands of engineer-hours and offers no competitive advantage.

**Multi-tenant from line one.** Every table is scoped by `business_id`. Row-Level Security in Postgres is the authorization boundary — not application code. This is not optional; it is the safety net.

---

## Architecture at a glance

```
                  ┌──────────────────────────────────────┐
                  │ Vercel (Edge + Node runtime)         │
                  │ ┌────────────────────────────────┐   │
                  │ │ Next.js App Router             │   │
                  │ │  • Server Components           │   │
                  │ │  • Server Actions              │   │
                  │ │  • API Route Handlers          │   │
                  │ │  • Middleware (auth + i18n)    │   │
                  │ └────────────────────────────────┘   │
                  └────────────┬─────────────────────────┘
                               │ HTTPS + JWT
                  ┌────────────▼─────────────────────────┐
                  │ Supabase                             │
                  │ ┌──────────┐ ┌──────────┐ ┌────────┐ │
                  │ │ Postgres │ │ Auth     │ │ Storage│ │
                  │ │ + RLS    │ │ (OAuth + │ │        │ │
                  │ │ + pg_cron│ │  Magic)  │ │        │ │
                  │ └──────────┘ └──────────┘ └────────┘ │
                  │ ┌──────────┐ ┌──────────────────────┐│
                  │ │ Realtime │ │ Edge Functions (Deno)││
                  │ └──────────┘ └──────────────────────┘│
                  └────────────┬─────────────────────────┘
                               │
                  ┌────────────▼─────────────────────────┐
                  │ Messaging Layer (abstracted)         │
                  │  • Resend (email)                    │
                  │  • Meta Cloud API (WhatsApp)         │
                  │  • Twilio (SMS, optional)            │
                  └──────────────────────────────────────┘
```

Everything else (Sentry for errors, PostHog for analytics, Cloudflare for DNS, Vercel Analytics for web vitals) attaches at the edges of this diagram.

---

## Stack inventory

### Frontend

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (latest stable)** with App Router | Server Components, edge runtime, mature ecosystem, Vercel synergy |
| UI runtime | **React** + **TypeScript (strict)** | Industry default, type safety end-to-end |
| Styling | **Tailwind CSS** (CSS-first config via `@theme`) | Speed of iteration, consistency, no runtime cost |
| Components | **shadcn/ui** | Copy-in primitives we own, customized to Klyro tokens |
| Forms | **React Hook Form** + **Zod** | Type-safe validation shared between client and server |
| Internationalization | **next-intl** | App Router native, locale-prefixed routes |
| State and mutations | **TanStack Query (React Query)** | Server-state caching where Server Components are not enough |
| Icons | **lucide-react** | Tree-shakable, consistent, large catalog |
| Animation | **framer-motion** | Used sparingly; smooth feel without overengineering |
| Date manipulation | **date-fns** | Functional, tree-shakable |
| Phone validation | **libphonenumber-js** | Country-aware E.164 parsing |

All dependencies installed with `@latest`; the `pnpm-lock.yaml` is the reproducibility source of truth.

### Backend

| Concern | Choice | Why |
|---|---|---|
| Database | **Supabase Postgres** | Mature, scalable, the only database we'd choose |
| Authorization | **Row-Level Security (RLS)** | Tenant isolation at the database layer, not the app |
| Authentication | **Supabase Auth** | Magic link, Google OAuth, Apple Sign-In — covered |
| API style | **Server Actions** + **Route Handlers** | Native to App Router; no separate API layer needed |
| Realtime updates | **Supabase Realtime** | Built into Postgres; dashboard updates without polling |
| File storage | **Supabase Storage** | Business logos and staff avatars; same auth + RLS model |
| Scheduled jobs | **pg_cron** + **Supabase Edge Functions** (Deno) | Reminders, async dispatch, no separate worker infra |
| Type generation | `supabase` CLI | Database types flow into TypeScript automatically |

### Messaging

Messaging is abstracted behind a `MessageRouter` interface in `src/lib/messaging/router.ts`. The router selects a template by `(vertical, language, channel, type)` and dispatches through the appropriate adapter:

| Channel | Provider | Notes |
|---|---|---|
| Email | **Resend** + **React Email** | Templates are React components; HTML rendered at send time |
| WhatsApp | **Meta Cloud API (direct)** | Native `fetch`, no SDK; templates pre-approved in Meta Business Manager |
| SMS | **Twilio** | Optional, gated behind an env flag |

The abstraction matters: if Meta changes its pricing or policies, we replace one adapter and the rest of the system is unaffected.

### Observability and operations

| Concern | Choice |
|---|---|
| Error tracking | **Sentry** (Next.js + manual ingest for Edge Functions) |
| Product analytics | **PostHog** |
| Web vitals | **Vercel Analytics** + **Speed Insights** |
| Logs | **pino** for structured logging in app code; Vercel + Supabase platform logs for infra |
| Uptime monitoring | **Better Stack** (external, free tier) |

### Testing

| Layer | Tool |
|---|---|
| Unit | **Vitest** |
| Component | **Vitest** + **Testing Library** |
| End-to-end | **Playwright** |
| Schema validation in tests | **Zod** (shared with production code) |
| RLS verification | Hand-rolled Supabase test scripts |

### Hosting and infrastructure

| Concern | Choice |
|---|---|
| Frontend hosting | **Vercel** (Hobby tier; Pro when the math says so) |
| Backend / DB / Auth / Realtime / Storage | **Supabase** (Free tier; Pro at ~50 active businesses) |
| DNS and domain | **Cloudflare** |
| Node version | **Node 22 LTS** (minimum) |
| Package manager | **pnpm (latest)**, pinned via `packageManager` field |

---

## Data model

Twelve tables. Vertical-agnostic. Multi-tenant by `business_id`.

```
businesses           — the account, the brand, the vertical
  ├── branches       — physical locations (one business has many)
  ├── users          — owners and staff (linked to auth.users)
  ├── staff          — staff profiles (one user can be one staff)
  │     └── staff_branches      — N:M (staff to branches)
  │     └── staff_availability  — weekly schedule per staff per branch
  ├── services       — service catalog
  │     └── branch_services     — service availability + price overrides per branch
  ├── clients        — end customers (the business's customers, not Klyro's)
  ├── appointments   — bookings (one client, one staff, one service, one slot)
  └── messages       — outbound communications (one appointment, many messages)
        └── message_templates   — content by (type, channel, language, vertical)
```

**Vertical extensibility:** `businesses.vertical` is a plain text field that references a key in a code-side registry (`src/lib/verticals/registry.ts`). Adding a new vertical is a code change, not a database migration. This was a deliberate design choice — it lets us move fast on positioning without schema friction.

**Message template scaling:** at launch we ship 84 templates (7 active verticals × 2 channels × 2 languages × 3 message types). All seeded via SQL migration; loaded by the MessageRouter at send time.

---

## Authentication and authorization

**Authentication** is handled by Supabase Auth. Three providers, three paths into the system:

- Google OAuth (primary for owners)
- Apple Sign-In (required for App Store compliance later)
- Magic link via email (fallback, no password ever)

Sessions are stored in httpOnly secure cookies. JWTs expire in one hour and refresh automatically for thirty days.

**Authorization** is enforced at the database layer via Row-Level Security policies. The application code never writes a manual `WHERE business_id = X` clause — Postgres does it for us, on every query, transparently. A staff member trying to query another staff member's appointments gets zero rows back. A business trying to read another business's data — same.

This is the single most important security decision in the system. It is not negotiable.

---

## Folder structure (high level)

```
klyro/
├── src/
│   ├── app/[locale]/         # Locale-prefixed App Router
│   │   ├── (marketing)/      # Public-facing landing
│   │   ├── (auth)/           # Login, signup, OAuth callback
│   │   ├── (dashboard)/      # Owner and staff dashboard
│   │   ├── (booking)/        # Public booking flow at /[slug]
│   │   └── api/              # Route handlers
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives, themed
│   │   ├── wizard/           # Setup wizard steps
│   │   ├── booking/          # Public booking components
│   │   ├── dashboard/        # Dashboard views
│   │   └── shared/           # Logo, ImageUpload, common widgets
│   ├── lib/
│   │   ├── supabase/         # Browser, server, middleware clients
│   │   ├── messaging/        # MessageRouter + provider adapters
│   │   ├── booking/          # Availability and slot computation
│   │   ├── verticals/        # The vertical registry
│   │   ├── schemas/          # Zod schemas shared client + server
│   │   ├── errors/           # ApiError + global handler
│   │   ├── format/           # Currency, date, phone formatters
│   │   ├── validation/       # Phone, slug helpers
│   │   ├── rate-limit/       # Upstash-backed limiters
│   │   ├── log/              # Pino logger + request wrappers
│   │   └── i18n/             # Country catalog, locale detection
│   ├── i18n/locales/         # es.json, en.json (every UI string)
│   └── types/database.ts     # Generated from Supabase schema
├── supabase/
│   ├── migrations/           # Versioned SQL (one file per change)
│   ├── functions/            # Deno Edge Functions
│   └── config.toml
├── tests/
│   ├── e2e/                  # Playwright
│   └── booking/              # API + vertical coverage tests
└── public/openapi.json       # Auto-generated, source-of-truth API spec
```

The structure is described in full in `Klyro_Technical_PRD.md` §3.

---

## API surface

The public API is documented via OpenAPI 3.0 in `public/openapi.json`, auto-generated from JSDoc annotations on Route Handlers and Zod schemas. The same spec drives:

- **Swagger UI** at `/api-docs` (dev only — 404 in production).
- **Postman collection** — importable directly from the JSON file.

Every endpoint follows Richardson Maturity Level 3 conventions: resources + HTTP verbs + HATEOAS `_links`. Responses are always wrapped in `{ data, meta?, _links }` for success and `{ error: { code, message, field? } }` for failure. Status codes are correct (201 for creation with `Location` header, 204 for deletion, 429 for rate limits).

Validation is performed by Zod schemas at the top of each route. Validation failures return `400` with a `field` pointer.

---

## Security posture

The non-negotiables:

- HTTPS-only (Vercel enforces).
- HttpOnly + Secure + SameSite=Lax cookies for sessions.
- CSRF protection via Next.js Server Actions origin validation.
- Rate limiting on public booking endpoints and auth endpoints, backed by Upstash Redis with a passthrough fallback for development.
- RLS policies everywhere. The service-role key is never used in client code and is used in server code only in tightly-scoped wizard actions where a new user has no `business_id` yet.
- Webhook signature validation for every external service (Meta, Twilio, Resend).
- No PII in logs. No PII in URL parameters.
- AES-256-GCM encryption at rest for any sensitive field that lives outside Supabase Auth's already-encrypted columns.
- Weekly `pnpm outdated` and `pnpm audit`; patch upgrades applied immediately.

---

## Cost profile

Estimated monthly cost during closed beta (10 pioneer businesses):

| Service | Cost |
|---|---|
| Vercel | $0 (Hobby) |
| Supabase | $0 (Free) |
| WhatsApp Cloud API | ~$5–15 |
| Twilio SMS (optional) | ~$10–30 |
| Resend | $0 (3,000 emails/month free) |
| Sentry, PostHog | $0 (free tiers) |
| Domain `klyro.app` | ~$1/month |
| **Total** | **$15–50/month** |

Scaling characteristics:

- Vercel and Supabase free tiers cover up to roughly fifty active businesses comfortably.
- WhatsApp Cloud API scales linearly per conversation (~$0.008–$0.012 per utility conversation in Latin America).
- The single largest cost driver post-launch is messaging volume, which is bounded by booking volume — a healthy unit-economics relationship.

---

## Build and CI

- **Package manager:** pnpm, version pinned via `packageManager` field.
- **CI:** GitHub Actions runs typecheck, lint, and unit tests on every PR. End-to-end Playwright tests run nightly and on `main`.
- **Deployment:** Vercel auto-deploys preview environments per PR; production deploys on merge to `main` (or `development` → `staging` → `main` pipeline, depending on phase).
- **Migrations:** applied via `pnpm dlx supabase@latest db push`. Database types regenerate after every applied migration.
- **Versioning:** semantic commits, one logical change per commit. Phases are tagged when complete (`phase-2-done`, `phase-3-done`, etc.).

---

## What we have explicitly not built

Knowing what is absent is as important as knowing what is present:

- No GraphQL layer (REST via Route Handlers is sufficient at this scale).
- No microservices (Next.js + Edge Functions are the entire backend).
- No separate admin app (the owner dashboard is the admin app).
- No Redis caching at the application level (Postgres is fast enough for current scale).
- No third-party scheduling library (booking and slot calculation are first-party code we own).
- No cropping library for image uploads (canvas-based resize is enough for MVP).
- No third-party form builder (React Hook Form is the form layer; we own the rest).

We will add complexity when complexity earns its keep. Until then, the small surface area is itself a feature.

---

## Where to go next

- For implementation specification: `Klyro_Technical_PRD.md`.
- For business and product context: `ProjectGoals.md`, `AppFeatures.md`.
- For development conventions and workflow: `CLAUDE.md`, `CLAUDE_CODE_WORKFLOW.md`.
- For the live API documentation: `/api-docs` on the local development server, or `public/openapi.json` for the raw spec.
- For build status: `STATUS.md` and `TASKS.md`.

---

## Contact

Engineering questions and integration inquiries: BridgeStack Dev (`adm@bridgestack.dev`).
