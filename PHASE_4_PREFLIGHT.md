# Phase 4 — Pre-flight Checklist

**Purpose:** Verify all external dependencies before writing any Phase 4 (Messaging Engine) code.
**Rule:** Phase 4 cannot start until every item below is ✅.
**Owner:** @jmendezrf
**Last updated:** 2026-05-25

---

## Checklist

### 1. WhatsApp Cloud API Access

| Item | Status | Notes |
|------|--------|-------|
| Meta Business Manager account created | ⬜ | business.facebook.com |
| WhatsApp Business Account (WABA) linked | ⬜ | Inside Meta Business Manager |
| Phone number registered (test number OK for dev) | ⬜ | Production number needs 1–7 business day verification |
| `WHATSAPP_PHONE_NUMBER_ID` obtained and set in prod env | ⬜ | Meta → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` obtained and set in prod env | ⬜ | System user token, not page token |
| `WHATSAPP_VERIFY_TOKEN` chosen (any secret string) and set | ⬜ | Used to verify webhook handshake |
| `WHATSAPP_APP_SECRET` obtained and set in prod env | ⬜ | Meta App → Settings → Basic |
| Webhook URL reserved: `https://klyro.app/api/webhooks/whatsapp` | ⬜ | Route does not exist yet — Phase 4 Block builds it |

**Responsible:** @jmendezrf
**Deadline:** Before Phase 4 Block A starts
**Dashboard:** https://business.facebook.com → WhatsApp Manager

---

### 2. Template Approval Pipeline

**Templates to submit first** (6 total — barbershop wedge, 3 types × 2 languages):

| Template name | Type | Language | Channel | Status |
|---------------|------|----------|---------|--------|
| `klyro_barbershop_confirmation_es` | confirmation | es | whatsapp | ⬜ Not submitted |
| `klyro_barbershop_confirmation_en` | confirmation | en | whatsapp | ⬜ Not submitted |
| `klyro_barbershop_reminder_24h_es` | reminder_24h | es | whatsapp | ⬜ Not submitted |
| `klyro_barbershop_reminder_24h_en` | reminder_24h | en | whatsapp | ⬜ Not submitted |
| `klyro_barbershop_cancellation_es` | cancellation | es | whatsapp | ⬜ Not submitted |
| `klyro_barbershop_cancellation_en` | cancellation | en | whatsapp | ⬜ Not submitted |

**Template content** is already seeded in `message_templates` DB table
(migration `0003_message_templates.sql`). Copy it from the DB when submitting to Meta.

**Approval lead time:** typically 24–72 hours; up to 5+ business days during Meta review
spikes. Submit before writing any Phase 4 send logic.

**Why barbershop first:** it's the wedge vertical — the first 10 pioneer businesses
are all barbershops. All other verticals (salon, fitness, etc.) can be submitted
in parallel or after beta launch.

**Responsible:** @jmendezrf
**Deadline:** Submit within 24 h of completing Phase 4 Block A (so approval arrives
before Block C needs to fire live messages)
**Dashboard:** Meta Business Manager → WhatsApp → Message Templates

---

### 3. WhatsApp Cloud API Pricing

| Item | Status | Notes |
|------|--------|-------|
| Current per-conversation price confirmed for Honduras (HN) | ⬜ | Check Meta pricing page |
| Monthly cost estimate documented below | ⬜ | |
| `Klyro_Technical_PRD.md` §2.8 budget updated if numbers shifted | ⬜ | |

**Estimate to verify:**
- 10 pioneer businesses × ~100 conversations/month = 1,000 conversations/month
- Meta charges per 24 h conversation window, not per message
- Marketing conversations (business-initiated) have a higher rate than utility/service
- Confirmation + reminder messages are **utility** category — cheaper tier
- Verify current HN rate at: https://developers.facebook.com/docs/whatsapp/pricing

**Responsible:** @jmendezrf
**Deadline:** Before Phase 4 Block A

---

### 4. Resend Email Setup

| Item | Status | Notes |
|------|--------|-------|
| `klyro.app` domain verified in Resend dashboard | ⬜ | app.resend.com → Domains |
| SPF record configured at Cloudflare | ⬜ | `v=spf1 include:amazonses.com ~all` |
| DKIM record configured at Cloudflare | ⬜ | Resend provides the CNAME |
| DMARC record configured at Cloudflare | ⬜ | `v=DMARC1; p=none; rua=mailto:dmarc@klyro.app` |
| `RESEND_API_KEY` set in production env vars (Vercel) | ⬜ | Already in `.env.example` and `env.ts` |
| Test email sent from `hola@klyro.app` via Resend | ⬜ | Confirm delivery before Phase 4 |

**Responsible:** @jmendezrf
**Deadline:** Before Phase 4 Block A
**Dashboard:** https://app.resend.com

---

### 5. Sentry on Supabase Edge Functions

| Item | Status | Notes |
|------|--------|-------|
| Confirmed whether Sentry SDK works inside Deno (Edge Function runtime) | ⬜ | Supabase Edge Functions run on Deno, not Node |
| If Sentry Deno SDK unavailable: manual HTTP ingest workaround documented | ⬜ | See workaround below |

**Context:** Supabase Edge Functions run on Deno. The Next.js `@sentry/nextjs` package
does **not** work there. Two options:

- **Option A (preferred):** Use `@sentry/deno` if available for the Sentry version in use.
  Check: https://docs.sentry.io/platforms/javascript/guides/deno/

- **Option B (fallback):** Send errors to Sentry's HTTP ingest directly:
  ```ts
  await fetch("https://sentry.io/api/<PROJECT_ID>/store/", {
    method: "POST",
    headers: { "X-Sentry-Auth": `Sentry sentry_key=<DSN_KEY>, sentry_version=7` },
    body: JSON.stringify({ message: error.message, level: "error" }),
  });
  ```
  The DSN key and project ID are in `NEXT_PUBLIC_SENTRY_DSN`.

**Decision needed:** Confirm Option A or B before Phase 4 Block A so the Edge Function
template includes the right error reporting from day one.

**Responsible:** @jmendezrf
**Deadline:** Before Phase 4 Block A

---

### 6. pg_cron Job Confirmed Running

| Item | Status | Notes |
|------|--------|-------|
| `dispatch-due-messages` cron job scheduled (migration applied) | ⬜ | Confirm in Supabase → Database → Extensions → pg_cron |
| pg_net extension enabled | ⬜ | Required for `net.http_post()` in the cron job |
| Live smoke test: dummy `messages` row picked up in <10 min | ⬜ | See test procedure below |

**Cron schedule:** every 5 minutes (`*/5 * * * *`) — defined in
`supabase/migrations/0004_pg_cron_reminders.sql`.

**Test procedure** (run in Supabase SQL editor):
```sql
-- 1. Insert a dummy message scheduled 1 minute in the past
INSERT INTO messages (appointment_id, type, channel, status, scheduled_at)
SELECT id, 'confirmation', 'whatsapp', 'pending', now() - interval '1 minute'
FROM appointments
LIMIT 1;

-- 2. Wait up to 10 minutes, then check:
SELECT id, status, sent_at FROM messages
WHERE status = 'sent' OR sent_at IS NOT NULL
ORDER BY created_at DESC LIMIT 5;
```

**Note:** The `dispatch-due-messages` Edge Function does not exist yet — it will be
built in Phase 4 Block A. Until then, the cron job will fire and call a non-existent
URL (no-op). Confirming the cron is scheduled is sufficient for this preflight.
The live end-to-end test (step 3 above) should be run after Phase 4 Block A ships
the Edge Function.

**Responsible:** @jmendezrf
**Deadline:** Cron schedule confirmed before Phase 4 Block A; live smoke test after Block A

---

## GO / NO-GO

**Current status: NO-GO** — all 6 items have open sub-tasks.

| # | Area | GO? |
|---|------|-----|
| 1 | WhatsApp Cloud API access | ⬜ |
| 2 | Template approval pipeline | ⬜ |
| 3 | WhatsApp pricing confirmed | ⬜ |
| 4 | Resend email setup | ⬜ |
| 5 | Sentry on Edge Functions | ⬜ |
| 6 | pg_cron confirmed running | ⬜ |

**→ Update this table to ✅ as each item is resolved. Phase 4 starts when all six are ✅.**

---

## Critical path note

Items 1 and 2 (WhatsApp access + template approval) are on Meta's timeline, not ours.
Template approval can take up to 5 business days. **Submit templates on Day 1 of
preflight** so approval arrives before Phase 4 Block C (the actual send logic).

Recommended execution order:
1. Today: Submit 6 barbershop WhatsApp templates to Meta
2. Today: Set up Resend domain + DNS at Cloudflare
3. Today: Confirm pg_cron is scheduled (Supabase dashboard)
4. Today: Decide Sentry Option A vs B
5. While waiting for Meta approval: build Phase 4 Blocks A + B
6. Once templates approved: Phase 4 Block C (MessageRouter live sends)
