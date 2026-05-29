# Phase 4 — Preflight Checklist

**Type:** Research + setup. NOT a coding phase.
**Branch:** None — output is a doc.
**Time estimate:** 1–2 hours of your time, plus 1–7 business days of waiting on Meta.

## Why this exists

Phase 4 (Messaging Engine) integrates three external services: WhatsApp Cloud API (Meta), Resend (email), and Twilio (SMS, optional). Two of these involve external approval workflows that take **days, not minutes**:

- WhatsApp number registration: 1–7 business days
- WhatsApp template approval: 24–72 hours per template, sometimes more during reviews
- Resend domain verification: 10 min – 2 hours (DNS propagation)

If we start coding Phase 4 without these in place, we hit a wall mid-phase. Doing this preflight up front means by the time you write the first line of `whatsapp.ts`, all credentials, approvals, and DNS records are ready.

## Output

A new file at repo root: `PHASE_4_PREFLIGHT.md` with the 6 sections below as a live checklist. Update it as you go. Commit when each section flips to ✅.

Phase 4 cannot start coding until ALL 6 sections are ✅. That is the gate.

## Update `STATUS.md`

Under the phase table, change Phase 4 row to:

```
| 4 — Messaging Engine | ⬜ Blocked on PHASE_4_PREFLIGHT.md |
```

---

## Section 1 — WhatsApp Cloud API Access

**What you need by the end of this section:**

- A verified Meta Business Manager account.
- A WhatsApp Business Account (WABA) inside it.
- A registered phone number (start with the test number — production number comes in Section 1b).
- 4 secrets ready to paste into `.env.local` and Vercel env vars:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN` (System User token, never an admin token)
  - `WHATSAPP_VERIFY_TOKEN` (a random string you generate, used by Meta to verify your webhook)
  - `WHATSAPP_APP_SECRET` (from the Meta App settings; used to validate webhook signatures)

**Steps:**

1. Go to https://business.facebook.com and create or sign into Meta Business Manager.
2. **Business Settings → WhatsApp Accounts → Add** → create a WhatsApp Business Account.
3. **Phone Numbers → Add phone number** → for the preflight, use the **test number** Meta gives you. It allows up to 5 recipient numbers (perfect for closed beta validation).
4. Go to https://developers.facebook.com and create a new App (type: Business).
5. In the App: **Add Product → WhatsApp → Set up**.
6. From the Quick Start panel, copy:
   - The **phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - The **temporary access token** (24h) — use this only for initial smoke testing.
7. Create a **System User** in Business Settings → System Users → assign the WhatsApp app with full permissions → generate a permanent access token → `WHATSAPP_ACCESS_TOKEN`.
8. In the App's **WhatsApp → Configuration**, copy the **App Secret** → `WHATSAPP_APP_SECRET`.
9. Generate a random 32-char string for `WHATSAPP_VERIFY_TOKEN`:
   ```bash
   openssl rand -hex 16
   ```
10. Add the 5 recipient phone numbers (the 10 pioneers' WhatsApp numbers and your own) to the test number's allowlist. Without this they cannot receive messages.

**Section 1 done when:**

- [ ] All 4 secrets are in `.env.local` and tested locally with a dummy `curl` call to `https://graph.facebook.com/v21.0/{phone_number_id}/messages` that returns 200.
- [ ] At least one test recipient is registered in the test number's allowlist.

**For Section 1b (production number, do later):**

The production number requires business verification (uploaded ID docs of the business owner, proof of business address). This takes 1–7 business days. **Start this process now even if you don't need it for closed beta** — by the time closed beta finishes (Day 70), you'll have the production number ready for self-serve.

---

## Section 2 — WhatsApp Template Approval Pipeline

**What you need by the end of this section:**

- 6 templates submitted to Meta for approval, covering Spanish + English for confirmation, reminder, cancellation.
- At least 3 (the Spanish set) approved before Phase 4 Block A starts.

**Background:**

WhatsApp distinguishes two message types:

- **Service messages** (user-initiated, free, within 24h reply window) — we don't use these in Phase 4.
- **Utility messages** (business-initiated, paid, templated) — confirmation, reminder, cancellation are all this type.

Every utility message must use a **pre-approved template** registered in Meta Business Manager. You can't just send free-form text.

**Templates to submit first (focus on barbershop wedge):**

Six total. Three message types × two languages × one vertical (barbershop) = 6 templates.

Template variables use `{{1}}, {{2}}, ...` placeholders. Don't use named variables.

**Template 1: `appointment_confirmation_barbershop_es`**
- Category: `UTILITY`
- Language: `es`
- Body:
  ```
  ¡Hola {{1}}! Tu cita está confirmada para {{2}} a las {{3}} con {{4}}. Te esperamos en {{5}}. Si necesitas cambiarla, escríbenos a este chat.
  ```

**Template 2: `appointment_confirmation_barbershop_en`**
- Category: `UTILITY`
- Language: `en`
- Body:
  ```
  Hi {{1}}! Your appointment is confirmed for {{2}} at {{3}} with {{4}}. See you at {{5}}. Need to reschedule? Just reply to this chat.
  ```

**Template 3: `appointment_reminder_24h_barbershop_es`**
- Category: `UTILITY`
- Language: `es`
- Body:
  ```
  Hola {{1}}, te recordamos tu cita mañana {{2}} a las {{3}} con {{4}} en {{5}}. ¡Te esperamos!
  ```

**Template 4: `appointment_reminder_24h_barbershop_en`**
- Category: `UTILITY`
- Language: `en`
- Body:
  ```
  Hi {{1}}, friendly reminder of your appointment tomorrow {{2}} at {{3}} with {{4}} at {{5}}. See you then!
  ```

**Template 5: `appointment_cancellation_barbershop_es`**
- Category: `UTILITY`
- Language: `es`
- Body:
  ```
  Hola {{1}}, tu cita del {{2}} a las {{3}} ha sido cancelada. Para reservar otra fecha visita {{4}}.
  ```

**Template 6: `appointment_cancellation_barbershop_en`**
- Category: `UTILITY`
- Language: `en`
- Body:
  ```
  Hi {{1}}, your appointment on {{2}} at {{3}} has been cancelled. Book another time at {{4}}.
  ```

**How to submit:**

1. Meta Business Manager → WhatsApp Manager → Message Templates → Create Template.
2. For each of the 6, fill in name, category (`UTILITY`), language, and body. No header, no footer, no buttons (keep it minimal for first approval).
3. Submit. Track status — it shows `PENDING`, then `APPROVED` or `REJECTED`.

**Common rejection reasons to avoid:**

- Promotional language in a UTILITY template (use `MARKETING` category if promotional, but those are slower to approve).
- Capital letters in placeholders (`{{NAME}}` is wrong — use `{{1}}`).
- URLs in body without using a URL button.
- Spelling errors (Meta is strict).

**Section 2 done when:**

- [ ] All 6 templates submitted.
- [ ] At least the 3 Spanish templates have status `APPROVED`.
- [ ] Document approved template names in `DECISIONS.md` (ADR-027) so Phase 4 Block A doesn't guess them.

**Note:** templates seeded in your DB (`message_templates` table) are **internal** — they're the message body that the MessageRouter loads. The Meta-approved templates are a separate registration at Meta's side. The two must align: the Meta template body must match (with variables) what `message_templates.content` contains. Document the alignment in `DECISIONS.md`.

---

## Section 3 — Pricing Confirmation

**Goal:** verify current WhatsApp Cloud API pricing for Honduras and target markets so the budget in `Klyro_Technical_PRD.md` §2.8 is accurate.

**Steps:**

1. Read https://developers.facebook.com/docs/whatsapp/pricing — the official pricing page. Look specifically at the Honduras rate (or "Mexico / Central America" if Honduras isn't listed separately).
2. As of November 2025, utility conversations in LATAM were ~$0.008–$0.012 each. Verify current numbers.
3. Calculate expected monthly cost: 10 pioneer businesses × 100 appointments/month × $0.012 = ~$12/month total during closed beta. Klyro absorbs this.
4. Confirm Resend free tier is still 3,000 emails/month with no domain limit.

**Section 3 done when:**

- [ ] Current per-conversation cost for Honduras is documented in `PHASE_4_PREFLIGHT.md`.
- [ ] Projected closed beta cost (~$12–20/month) confirmed within budget.
- [ ] If costs are >50% higher than the original estimate, flag for revisiting the pricing strategy before launch.

---

## Section 4 — Resend Email Setup

**Goal:** verify the `klyro.app` domain in Resend so emails actually deliver (not into spam).

**Steps:**

1. Sign into Resend → Domains → Add Domain → `klyro.app`.
2. Resend gives you DNS records to add. Copy:
   - 1 TXT record for SPF
   - 3 CNAME records for DKIM
   - Optionally 1 TXT for DMARC (`v=DMARC1; p=quarantine; rua=mailto:dmarc@klyro.app`)
3. Add these in Cloudflare DNS for `klyro.app`. **Important:** Cloudflare proxy must be OFF (gray cloud, not orange) for DKIM CNAMEs.
4. Wait 10–60 minutes for DNS propagation.
5. In Resend, click **Verify** on the domain. Should show all records as ✅ verified.
6. Send a test email via Resend dashboard → Send Email → from `hola@klyro.app` to your own inbox. Confirm:
   - It lands in **Primary** inbox, not Promotions or Spam.
   - The `Reply-To` is correct.
   - View headers and confirm DKIM = pass, SPF = pass.

**Section 4 done when:**

- [ ] `klyro.app` shows ✅ verified in Resend dashboard.
- [ ] Test email lands in Primary inbox of Gmail.
- [ ] `RESEND_API_KEY` is in `.env.local` and tested with a `curl` to `https://api.resend.com/emails`.

---

## Section 5 — Sentry on Edge Functions

**Goal:** confirm Sentry catches errors thrown inside Supabase Edge Functions (separate from the Next.js Sentry integration which is already set up).

Supabase Edge Functions run in Deno, not Node. The `@sentry/nextjs` package doesn't apply. There are two paths:

**Option A (recommended): manual HTTP ingest.**

In each Edge Function, wrap the handler with a try/catch that POSTs errors to Sentry's ingest endpoint directly:

```ts
async function reportToSentry(err: unknown) {
  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return;
  // POST to https://sentry.io/api/{project}/store/ with the JSON envelope
  // see: https://develop.sentry.dev/sdk/store/
}
```

Document this pattern in a shared helper at `supabase/functions/_shared/sentry.ts`.

**Option B: `@sentry/deno` if it exists.**

Check if Sentry has a stable Deno SDK. If yes, use it. If experimental or no, go with Option A.

**Section 5 done when:**

- [ ] Decision documented: Option A or B (in `DECISIONS.md` ADR-028).
- [ ] A test Edge Function throws an error and you see it in the Sentry dashboard within 1 minute.
- [ ] `SENTRY_DSN` is in the Supabase Edge Functions secrets (separate from Vercel secrets — set via `supabase secrets set`).

---

## Section 6 — pg_cron Path End-to-End

**Goal:** prove the `pg_cron → Edge Function` path works by sending a dummy message through it, BEFORE Phase 4 implements the real MessageRouter.

This is the highest-risk integration of Phase 4. If pg_cron isn't actually invoking the Edge Function, the whole reminder system silently fails. Verifying now means Phase 4 only has to debug the MessageRouter logic, not the cron path.

**Steps:**

1. Deploy a minimal Edge Function at `supabase/functions/preflight-cron-ping/index.ts` that just inserts a row into a debug table:
   ```ts
   serve(async () => {
     const supabase = createClient(/* ... */);
     await supabase.from('cron_pings').insert({ pinged_at: new Date().toISOString() });
     return new Response('ok');
   });
   ```
2. Create the debug table (migration `0009_cron_pings.sql`):
   ```sql
   create table cron_pings (
     id uuid primary key default gen_random_uuid(),
     pinged_at timestamptz not null default now()
   );
   ```
3. Update the existing `pg_cron` job (`dispatch-due-messages`) to also call this preflight endpoint, OR temporarily add a second cron job that calls the preflight endpoint every 1 minute.
4. Wait 2–3 minutes.
5. `SELECT count(*), max(pinged_at) FROM cron_pings;` — should be incrementing.

**Section 6 done when:**

- [ ] `cron_pings` table has rows being inserted automatically every minute (or 5 min if you didn't add the temporary job).
- [ ] Drop the temporary 1-minute cron job (do not leave it running in production).
- [ ] Keep the `cron_pings` table and migration — useful as a health check signal for Phase 4 monitoring.

---

## Final GO / NO-GO

At the bottom of `PHASE_4_PREFLIGHT.md`, add:

```markdown
## GO / NO-GO

- [ ] Section 1 — WhatsApp Cloud API access (4 secrets ready)
- [ ] Section 2 — At least 3 Spanish templates approved
- [ ] Section 3 — Pricing verified, within budget
- [ ] Section 4 — Resend domain verified
- [ ] Section 5 — Sentry catches Edge Function errors
- [ ] Section 6 — pg_cron path verified end-to-end

**Phase 4 starts when all six are ✅.**
```

---

## What you'll commit

Two commits at the end:

**Commit 1** — at the start of preflight:

```
docs(phase-4): preflight checklist for messaging engine

Adds PHASE_4_PREFLIGHT.md with 6-section GO/NO-GO checklist
for external integrations (WhatsApp Cloud API, Resend, Sentry
Edge, pg_cron). Phase 4 coding blocked until all six are green.

Refs: STATUS.md Phase 4
```

**Commit 2** — when all sections are ✅:

```
chore(phase-4): preflight GO — all 6 sections verified

WhatsApp templates approved (3 ES). Resend domain verified.
Sentry on Edge Functions wired (Option A: manual ingest).
pg_cron path verified via cron_pings table.

ADR-027: Meta template names registered
ADR-028: Sentry Option A for Edge Functions
```

---

## Time estimate breakdown

| Section | Your time | External wait |
|---|---|---|
| 1. WhatsApp access | 30 min | 0 (test number is instant) |
| 2. Template approval | 20 min to submit | 24–72 hours per template |
| 3. Pricing check | 10 min | 0 |
| 4. Resend DNS | 15 min | 10–60 min DNS propagation |
| 5. Sentry on Edge | 30 min | 0 |
| 6. pg_cron verify | 20 min | 5 min waiting for cron tick |
| **Total** | **~2 hours active** | **~3 days passive** (mostly Meta templates) |

The smart move: do Sections 1, 2, 4 first (because they have external waits), then 3, 5, 6 while you wait for template approvals and DNS.

## When you're done

Tell me "preflight GO" and I'll generate the spec for Phase 4 Block A (MessageRouter abstraction + WhatsApp adapter). That's where the real coding starts.
