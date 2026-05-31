# Implementation Plan: Automated Appointment Messaging

**Branch**: `001-automated-messaging` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-automated-messaging/spec.md`

---

## Summary

Build the end-to-end automated messaging pipeline for Klyro. When a client books an appointment, the system immediately schedules a confirmation message and a 24-hour reminder in the `messages` table. A `pg_cron` job (every 5 minutes) picks up due messages and dispatches them via a Supabase Edge Function that calls the correct provider (WhatsApp → SMS → Email) using the right template keyed by `(vertical, language, channel, type)`. Delivery status updates arrive asynchronously via provider webhooks and update the `messages.status` field. The owner sees per-appointment message statuses in the dashboard. A public cancel endpoint (token-authenticated via `cancel_token` on the appointment) handles client-initiated cancellations and triggers a cancellation message.

**Critical gap identified**: The `POST /api/booking/create` route creates appointments but does not insert `messages` records. The `src/lib/messaging/` directory and `supabase/functions/` are empty scaffolds. The webhook handlers are empty. This plan fills those gaps entirely.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Deno (Supabase Edge Functions)

**Primary Dependencies**:
- Next.js 16.2.x (App Router, Route Handlers)
- Supabase JS SDK + SSR (DB, Realtime, Edge Functions)
- Meta Cloud API — native `fetch`, no SDK
- Twilio SDK (`twilio@latest`)
- Resend SDK + React Email (`resend@latest`, `react-email@latest`)
- Vitest + Testing Library (unit/component tests)
- Playwright (E2E)

**Storage**: Supabase Postgres — `messages`, `message_templates`, `appointments`, `clients`, `branches`, `businesses` (all tables already exist with RLS)

**Testing**: Vitest (unit + component), Playwright (E2E)

**Target Platform**: Vercel (Next.js app) + Supabase (Edge Functions + pg_cron)

**Performance Goals**:
- Booking creation (appointment + message scheduling): < 500ms p95
- Dispatch Edge Function: processes all due messages within 5-minute cron window
- Webhook delivery status update: < 300ms p95

**Constraints**:
- No PII in logs or Sentry payloads
- All webhook payloads must be signature-validated before processing
- `business_id` must never be derived from client input — always from session or DB join
- Supabase Free tier (no connection pool; keep queries minimal per request)

**Scale/Scope**:
- Closed beta: ~10 pioneer businesses, ~50–200 appointments/day
- Template count: 84 (7 verticals × 2 channels × 2 languages × 3 types) — already seeded
- Message volume: ~2–4 messages per appointment

---

## Constitution Check

*GATE: Must pass before Phase 0 research.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ PASS | Webhook signature validation planned for all 3 providers; cancel tokens are UUID (122-bit entropy); no PII in logs; rate limiting on cancel endpoint |
| II. Multi-Tenant Isolation | ✅ PASS | `business_id` always derived from DB join on appointment; RLS covers `messages` table via `business_id`; client never supplies `business_id` |
| III. Vertical-Agnostic | ✅ PASS | MessageRouter reads template by `(vertical, language, channel, type)` from DB; zero vertical conditionals in application code |
| IV. Test-Driven Quality Gates | ✅ PASS | Unit tests required for MessageRouter, variable interpolation, channel priority, webhook signature; E2E covers 2 verticals |
| V. Design System Fidelity | ✅ PASS | MessageStatusPanel uses design tokens; no raw hex; JetBrains Mono not applicable here |
| VI. Spanish-First i18n | ✅ PASS | Templates already seeded in `es` and `en`; cancel page (if any) needs both locales |
| VII. API Level 3 | ✅ PASS | Cancel endpoint and message-status endpoint follow HATEOAS shape; webhook endpoints are provider callbacks (no HATEOAS required); `@openapi` blocks required on new public routes |

**No violations. Pre-design gate PASSES.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-automated-messaging/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── cancel-endpoint.md
│   ├── message-status-endpoint.md
│   └── webhooks.md
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       ├── appointments/
│       │   └── [id]/
│       │       └── cancel/
│       │           └── route.ts          # NEW: public cancel endpoint (token-auth)
│       └── webhooks/
│           ├── whatsapp/route.ts         # FILL: Meta delivery status webhook
│           ├── twilio/route.ts           # FILL: Twilio delivery status webhook
│           └── resend/route.ts           # FILL: Resend delivery event webhook
├── lib/
│   └── messaging/
│       ├── types.ts                      # NEW: MessagePayload, ChannelResult, DispatchResult
│       ├── variables.ts                  # NEW: template variable interpolation
│       ├── router.ts                     # NEW: MessageRouter (template lookup, channel priority)
│       ├── schedule.ts                   # NEW: scheduleMessages() called from booking/create
│       └── channels/
│           ├── whatsapp.ts               # NEW: Meta Cloud API adapter
│           ├── sms.ts                    # NEW: Twilio adapter
│           └── email.tsx                 # NEW: Resend + React Email adapter
└── components/
    └── dashboard/
        └── messaging/
            └── MessageStatusPanel.tsx    # NEW: per-appointment message status UI

supabase/
└── functions/
    └── dispatch-due-messages/
        └── index.ts                      # NEW: Edge Function (Deno)

tests/
└── messaging/
    ├── router.test.ts                    # NEW
    ├── variables.test.ts                 # NEW
    ├── whatsapp.test.ts                  # NEW
    └── webhooks.test.ts                  # NEW
```

**Changed files** (existing, not new):
- `src/app/api/booking/create/route.ts` — add `scheduleMessages()` call after appointment insert
- `supabase/migrations/` — add `0010_cancel_token.sql` (adds `cancel_token` to `appointments`, adds `{cancel_link}` to confirmation templates, adds `cancelled` status to messages)

---

## Delivery Blocks

> Each block = one session + one commit. Run `pnpm typecheck && pnpm lint && pnpm test` before committing.

### Block 1 — DB migration + message scheduling on booking creation

**Scope**:
1. Migration `0010_cancel_token.sql`:
   - Add `cancel_token uuid not null default gen_random_uuid()` to `appointments`
   - Add `'cancelled'` to the `messages.status` check constraint (needed to void pending reminders)
   - Update all 14 WhatsApp confirmation templates to append `\nCancelar: {cancel_link}` (es) / `\nCancel: {cancel_link}` (en)
   - Update all 14 email confirmation templates to append the cancel link as a footer section
2. `src/lib/messaging/schedule.ts` — `scheduleMessages(appointmentId, startsAt, businessId)` function:
   - Inserts a `confirmation` message row with `scheduled_at = now()`
   - Inserts a `reminder_24h` message row with `scheduled_at = starts_at - interval '24 hours'`
   - Skips the reminder if `starts_at - now() < 24 hours`
   - Derives the channel from the branch's `whatsapp_number` presence (primary) and business settings
3. Update `src/app/api/booking/create/route.ts` to call `scheduleMessages()` after a successful appointment insert
4. Unit tests: `scheduleMessages` inserts correct records; skips reminder for near-term appointments

**Exit criterion**: A booking creates exactly 1 or 2 `messages` rows; `pnpm test` passes.

---

### Block 2 — MessageRouter + variable interpolation

**Scope**:
1. `src/lib/messaging/types.ts` — define `MessagePayload`, `ChannelResult`, `TemplateVariables`
2. `src/lib/messaging/variables.ts` — `interpolate(template: string, vars: Record<string, string>): string`
   - Replaces all `{placeholder}` occurrences; throws if a required variable is missing
3. `src/lib/messaging/router.ts` — `MessageRouter` class:
   - `resolve(messageId)`: loads message + appointment + client + branch + business + staff + service
   - Determines channel priority: WhatsApp if `client.whatsapp_number` set AND business has WhatsApp configured; fall back to SMS if `client.phone` set AND business has Twilio configured; fall back to email if `client.email` set AND business has Resend configured
   - Looks up template by `(type, channel, language, vertical)` from `message_templates`
   - Builds `TemplateVariables` from appointment data (date formatted per branch timezone and language, time, staff display name, branch address, cancel URL from `appointment.cancel_token`)
   - Returns `MessagePayload` ready for a channel adapter
4. Unit tests: template resolution for all 3 types; channel fallback logic; variable interpolation edge cases

**Exit criterion**: `MessageRouter.resolve()` returns the correct template and variables for at least 2 verticals and both languages.

---

### Block 3 — Channel adapters

**Scope**:
1. `src/lib/messaging/channels/whatsapp.ts`:
   - `sendWhatsApp(to: string, body: string): Promise<ChannelResult>`
   - Calls Meta Cloud API `POST /v18.0/{PHONE_NUMBER_ID}/messages`
   - Returns `{ success, providerMessageId, error? }`
2. `src/lib/messaging/channels/sms.ts`:
   - `sendSMS(to: string, body: string): Promise<ChannelResult>`
   - Uses Twilio REST API; formats phone via `libphonenumber-js`
3. `src/lib/messaging/channels/email.tsx`:
   - `sendEmail(to: string, subject: string, body: string, businessName: string): Promise<ChannelResult>`
   - Uses Resend SDK; wraps body in a minimal React Email layout with business name
4. Unit tests for each adapter using mocked HTTP responses

**Exit criterion**: All three adapters return a `ChannelResult`; mocked tests pass for success and failure cases.

---

### Block 4 — Dispatch Edge Function

**Scope**:
1. `supabase/functions/dispatch-due-messages/index.ts` (Deno):
   - Authenticates with service role key from env
   - Queries: `SELECT id FROM messages WHERE status = 'pending' AND scheduled_at <= now() LIMIT 100`
   - For each message:
     - Calls `MessageRouter.resolve(messageId)` (adapted for Deno/Edge)
     - Calls the appropriate channel adapter
     - On success: `UPDATE messages SET status = 'sent', provider_message_id = X, sent_at = now() WHERE id = Y`
     - On failure: `UPDATE messages SET status = 'failed', error = reason WHERE id = Y`
   - Processes messages serially (not parallel) to stay within Supabase Free tier connection limits
2. Local test: invoke with `supabase functions serve` and verify a pending message gets dispatched

**Exit criterion**: A pending confirmation message in the DB gets dispatched and its status updates to `sent`.

---

### Block 5 — Delivery webhooks

**Scope**:
1. `src/app/api/webhooks/whatsapp/route.ts`:
   - `GET` handler for Meta webhook verification (hub.challenge)
   - `POST` handler: validate `X-Hub-Signature-256` using `WHATSAPP_APP_SECRET`; parse status events (`delivered`, `read`, `failed`); update `messages.status` by `provider_message_id`
2. `src/app/api/webhooks/twilio/route.ts`:
   - Validate Twilio signature using `TWILIO_AUTH_TOKEN`; parse `MessageStatus`; update `messages.status`
3. `src/app/api/webhooks/resend/route.ts`:
   - Validate Resend webhook signature; parse `email.delivered` / `email.bounced`; update `messages.status`
4. Unit tests: valid and invalid signatures; status update logic

**Exit criterion**: All three webhooks validate signatures and update `messages.status`; `pnpm test` passes.

---

### Block 6 — Cancel endpoint + cancellation messages

**Scope**:
1. `src/app/api/appointments/[id]/cancel/route.ts`:
   - `POST` (public, no session required)
   - Body: `{ token: string }` — validate `token` matches `appointments.cancel_token`
   - Only cancels appointments with status `confirmed` or `pending`
   - Transitions appointment to `cancelled`, sets `cancelled_at = now()`
   - Marks any pending `reminder_24h` messages as `cancelled` (new status from Block 1 migration)
   - Inserts a `cancellation` message row with `scheduled_at = now()`
   - Returns `200` with `{ data: { status: 'cancelled' }, _links: { self, booking } }`
   - Rate limited (same rate limiter pattern as booking/create)
2. Unit tests: valid token, expired token (appointment already cancelled), wrong token

**Exit criterion**: A client can cancel via the link in a confirmation message; a cancellation message is scheduled.

---

### Block 7 — Dashboard message status UI

**Scope**:
1. `src/components/dashboard/messaging/MessageStatusPanel.tsx`:
   - Displays a table/list of all messages for an appointment
   - Columns: type, channel, status badge (color-coded via design tokens), sent_at, provider_message_id (truncated)
   - Subscribes to Supabase Realtime on `messages` table filtered by `appointment_id` for live status updates
   - Handles pending (no timestamp), sent, delivered, failed, cancelled states with appropriate icons
2. Integrate `MessageStatusPanel` into the appointment detail/drawer in the agenda view
3. i18n strings in `es.json` and `en.json` for all label text
4. Component tests: renders all status states; Realtime subscription fires correctly on mock update

**Exit criterion**: Owner opens an appointment in the dashboard and sees message statuses update live when a webhook arrives.

---

## Complexity Tracking

No constitution violations. No complexity justification required.

---

## Implementation Order Rationale

Blocks 1 → 2 → 3 → 4 form the critical path (booking creates records → router resolves them → adapters send → Edge Function dispatches). Blocks 5 and 6 are independent after Block 4. Block 7 is purely additive UI and can be built last against real data from Blocks 1–4.
