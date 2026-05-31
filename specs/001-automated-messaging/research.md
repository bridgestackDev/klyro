# Research: Automated Appointment Messaging

**Branch**: `001-automated-messaging` | **Date**: 2026-05-28

---

## Overview

All major technical decisions for this feature were pre-resolved in the Technical PRD v2.0 and the existing codebase. No NEEDS CLARIFICATION markers remain. This document records each decision, its rationale, and alternatives considered.

---

## Decision 1: Message dispatch via pg_cron + Supabase Edge Function

**Decision**: Messages are stored as rows in the `messages` table with a `scheduled_at` timestamp. A `pg_cron` job runs every 5 minutes and calls the `dispatch-due-messages` Edge Function, which processes all `status='pending'` rows where `scheduled_at <= now()`.

**Rationale**: The database is already the source of truth for message state. Keeping scheduling in the DB (via `scheduled_at`) means no external queue infrastructure is needed at MVP scale. The Edge Function is stateless and idempotent — if it crashes mid-run, the next 5-minute cycle picks up where it left off. For the closed beta volume (~200 appointments/day = ~400–800 messages/day), a 5-minute polling interval is well within acceptable latency.

**Alternatives considered**:
- Supabase Database Webhooks → pg_net to trigger dispatch on INSERT: would achieve near-instant dispatch but adds complexity (concurrent Edge Function invocations, no retry back-pressure). Premature for beta scale.
- Background Jobs / Redis Queue (BullMQ, etc.): not available on Supabase Free, adds infra dependency not needed at this scale.

---

## Decision 2: Channel priority — WhatsApp → SMS → Email

**Decision**: For each message, the system attempts channels in this order: (1) WhatsApp if the client has a `whatsapp_number` and the business has WhatsApp configured, (2) SMS via Twilio if the client has a `phone` and the business has Twilio configured, (3) Email via Resend if the client has an `email`.

**Rationale**: WhatsApp penetration in Honduras and Latin America is >90% for the target demographic. It is the primary booking channel owners already use. SMS is a reliable fallback for clients on feature phones or without data. Email is the last resort — clients who booked via WhatsApp may not check email promptly. This matches what the business owner expects from wizard step 7 (Notifications).

**Alternatives considered**:
- Owner-configurable priority per business: deferred to v2 per scope boundary in the spec.
- Per-client preference: overcomplicated for MVP; the booking form only collects phone/WhatsApp number.

---

## Decision 3: Cancel token as `uuid` on the `appointments` table

**Decision**: A `cancel_token uuid not null default gen_random_uuid()` column is added to `appointments` via migration. The cancel URL included in confirmation messages is `{APP_URL}/api/appointments/{id}/cancel` with the token as a POST body (not a query param, to avoid server logs capturing it).

**Rationale**: A random UUID provides 122 bits of entropy — sufficient against brute force. Storing it in the `appointments` table means it is automatically scoped to the appointment and can be revoked by cancellation (the token is single-use: once an appointment is cancelled, the endpoint rejects further attempts). No JWT or separate token table needed.

**Alternatives considered**:
- Signed JWT (HMAC): adds key management complexity for minimal security gain at this scale.
- Separate `cancel_tokens` table: unnecessary indirection; the appointment row already owns the token.
- Query parameter: avoided because URLs appear in server access logs, which would leak the token. POST body is safer.

---

## Decision 4: Template variable interpolation via `{placeholder}` syntax

**Decision**: The existing templates use `{placeholder}` syntax (e.g., `{nombre}`, `{fecha}`, `{hora}`). The `variables.ts` module replaces all `{...}` occurrences using a simple string replace loop. Missing required variables throw an error caught by the dispatch function (marks the message as `failed`).

**Rationale**: The templates are already in production in this format. Changing to Handlebars or Mustache would require migrating all 84 templates. The simple replace loop is adequate for the variable set in use.

**Alternatives considered**:
- Handlebars/Mustache: more powerful but adds a dependency and requires template migration.
- Tagged template literals: cannot be stored in the DB as plain text.

---

## Decision 5: Confirmation message includes `{cancel_link}` via template update (not appended at dispatch)

**Decision**: A migration adds `{cancel_link}` to the `variables` JSON array of all confirmation templates and appends a cancel line to the template `content`. This means the template DB is the single source of truth for message content.

**Rationale**: If the cancel link were appended at dispatch time outside the template, the content would diverge from what's in the DB — making the template non-WYSIWYG. Keeping it in the template maintains the contract that `message_templates.content` is exactly what the client receives (after variable substitution).

**Alternatives considered**:
- Append at dispatch time: simpler migration, but content then lives partly in the template and partly in code — harder to audit or update.

---

## Decision 6: `'cancelled'` added to `messages.status` check constraint

**Decision**: A migration adds `'cancelled'` to the `messages.status` check: `('pending','sent','delivered','failed','cancelled')`. Pending reminder messages for a cancelled appointment are updated to `cancelled` rather than deleted.

**Rationale**: Preserving history allows the owner's dashboard to show "reminder was cancelled because the appointment was cancelled" rather than a confusing gap where a reminder row simply disappears. Marking as `cancelled` is also idempotent — safe to apply multiple times.

**Alternatives considered**:
- Delete the pending reminder row: destroys audit trail.
- Mark as `failed` with a reason: works but misleads the owner into thinking there was a delivery failure.

---

## Decision 7: Edge Function processes messages serially, not in parallel

**Decision**: The `dispatch-due-messages` Edge Function iterates through due messages one at a time rather than using `Promise.all()`.

**Rationale**: Supabase Free tier uses a shared Postgres connection pool with limited concurrency. Parallel DB writes from within the same Edge Function invocation risk contention. At beta volume (~400 messages/day = ~14/hour = ~2 per 5-minute window), serial processing is trivially fast enough and avoids connection pool exhaustion.

**Alternatives considered**:
- `Promise.all()` with a concurrency limit: premature optimization for beta scale.
- Separate Edge Function invocation per message: adds latency per dispatch cycle.

---

## Decision 8: React Email for email templates

**Decision**: Email template HTML is rendered via React Email components (`@react-email/components`). The text content from `message_templates` is wrapped in a simple layout component with the business name.

**Rationale**: React Email is already in the tech stack (PRD §2.3). It provides safe HTML escaping, responsive layout, and Resend integration. Using it ensures emails render correctly across Gmail, Outlook, Apple Mail.

**Alternatives considered**:
- Plain HTML strings: XSS risk if template content or variable values are not escaped correctly.
- Nodemailer + MJML: more complex, not in the stack.
