# Quickstart: Automated Appointment Messaging

How to run and verify the messaging feature locally end-to-end.

---

## Prerequisites

1. Supabase project running locally or using the remote project (`ouexfehqxpgewzgytjgc`)
2. `.env.local` populated with at minimum:
   - `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (optional for local)
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (optional for local — use Resend's test mode)
   - `NEXT_PUBLIC_APP_URL` (set to `http://localhost:3000` locally)
3. Supabase CLI installed: `pnpm dlx supabase@latest`

---

## Step 1: Apply the migration

```bash
# Push migration 0010 to your remote Supabase project
pnpm dlx supabase@latest db push

# Or apply locally
pnpm dlx supabase@latest db reset  # re-runs all migrations + seeds
```

Verify: `SELECT cancel_token FROM appointments LIMIT 1` returns a UUID.
Verify: `SELECT status FROM messages WHERE status = 'cancelled'` runs without error.

---

## Step 2: Start the dev server

```bash
cd klyro
pnpm dev
```

---

## Step 3: Create a test booking

```bash
curl -s -X POST http://localhost:3000/api/booking/create \
  -H "Content-Type: application/json" \
  -d '{
    "staffId": "<real-staff-uuid>",
    "serviceId": "<real-service-uuid>",
    "branchId": "<real-branch-uuid>",
    "slotStart": "2026-05-30T15:00:00Z",
    "clientName": "Test Client",
    "clientPhone": "+50412345678"
  }'
```

**Expected**: `201` response with `bookingCode: "KLY-XXXX"`

Verify message rows were created:
```sql
SELECT type, status, scheduled_at, channel
FROM messages
WHERE appointment_id = '<appointment-id from booking>'
ORDER BY scheduled_at;
```

Expected: 2 rows — `confirmation` (scheduled_at ≈ now) and `reminder_24h` (scheduled_at = starts_at - 24h).

---

## Step 4: Trigger dispatch manually (skip the 5-min cron)

```bash
# Serve Edge Functions locally
pnpm dlx supabase@latest functions serve dispatch-due-messages --env-file .env.local

# In another terminal, invoke:
curl -s -X POST http://localhost:54321/functions/v1/dispatch-due-messages \
  -H "Authorization: Bearer <service_role_key>"
```

**Expected**: The confirmation message row transitions from `pending` → `sent`, with `provider_message_id` populated and `sent_at` set.

Check WhatsApp (or mock output in test mode): the client's phone receives the correct confirmation message.

---

## Step 5: Simulate a webhook delivery update

```bash
# Simulate a WhatsApp delivery status
curl -s -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=<compute-hmac>" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "<provider_message_id>",
            "status": "delivered",
            "timestamp": "1716912345",
            "recipient_id": "50412345678"
          }]
        }
      }]
    }]
  }'
```

Verify: `SELECT status FROM messages WHERE id = '<msg-id>'` returns `delivered`.

---

## Step 6: Test cancellation

```bash
# Get the cancel_token for the appointment
psql "$(pnpm dlx supabase@latest db connection-string)" \
  -c "SELECT cancel_token FROM appointments WHERE id = '<appointment-id>'"

# Cancel via the endpoint
curl -s -X POST http://localhost:3000/api/appointments/<appointment-id>/cancel \
  -H "Content-Type: application/json" \
  -d '{ "token": "<cancel_token>" }'
```

**Expected**:
- `200` with `status: "cancelled"`
- The `reminder_24h` message row is now `cancelled`
- A new `cancellation` message row is `pending`
- Run dispatch again → cancellation message is sent

---

## Step 7: Check dashboard message status

1. Open the owner dashboard at `http://localhost:3000/es/agenda`
2. Click on the test appointment
3. The `MessageStatusPanel` should show:
   - Confirmation: Delivered (green badge)
   - Reminder: Pending (grey badge) or Cancelled (if cancelled)
   - Cancellation: Sent / Delivered (if dispatch ran)

---

## Running the tests

```bash
pnpm test                        # all unit + component tests
pnpm test tests/messaging/       # messaging tests only
pnpm test:e2e                    # full booking → message E2E (requires dev server running)
```

---

## Environment variables needed for production

Add to `.env.example` (and `src/lib/env.ts`):

```bash
# Already present:
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
RESEND_API_KEY=
RESEND_FROM_EMAIL=hola@klyro.app

# New (add in Block 5):
RESEND_WEBHOOK_SECRET=
```
