# API Contract: Delivery Status Webhooks

Three endpoints receive asynchronous delivery status updates from messaging providers.
All three are public (no session), authenticated via provider signature headers.

---

## WhatsApp (Meta Cloud API)

**Route**: `GET /api/webhooks/whatsapp` (verification) + `POST /api/webhooks/whatsapp` (events)

### GET — Webhook verification

Meta sends a GET request when you configure the webhook URL.

**Query params**: `hub.mode`, `hub.verify_token`, `hub.challenge`

**Handler logic**:
1. Verify `hub.verify_token === WHATSAPP_VERIFY_TOKEN` (env var)
2. If valid: respond `200` with `hub.challenge` as plain text
3. If invalid: respond `403`

---

### POST — Delivery status events

**Signature validation**:
- Header: `X-Hub-Signature-256: sha256=<hex>`
- Compute: `HMAC-SHA256(raw_body, WHATSAPP_APP_SECRET)`
- Compare using timing-safe comparison. Return `403` if invalid.

**Event payload** (relevant subset):

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "wamid.abc123",
          "status": "delivered",
          "timestamp": "1716912345",
          "recipient_id": "50412345678"
        }]
      }
    }]
  }]
}
```

**Handler logic**:
1. Validate signature
2. For each status in `entry[].changes[].value.statuses`:
   - Map Meta status → Klyro status: `"delivered"` → `"delivered"`, `"read"` → `"delivered"`, `"failed"` → `"failed"`, `"sent"` → `"sent"`
   - `UPDATE messages SET status = $1 WHERE provider_message_id = $2 AND status != 'delivered'`
   - (Don't downgrade `delivered` to `sent`)
3. Respond `200 OK` immediately — Meta retries if you don't respond within 20s

---

## Twilio (SMS)

**Route**: `POST /api/webhooks/twilio`

### Signature validation

- Header: `X-Twilio-Signature`
- Twilio SDK provides `validateRequest(authToken, signature, url, params)`
- Use `TWILIO_AUTH_TOKEN` from env. Return `403` if invalid.

**Event payload** (form-encoded, parsed from body):

| Field | Values |
|-------|--------|
| `MessageSid` | Provider message ID |
| `MessageStatus` | `sent`, `delivered`, `undelivered`, `failed` |
| `ErrorCode` | Present on failure |

**Handler logic**:
1. Validate signature using Twilio SDK helper
2. Map Twilio status → Klyro status: `"delivered"` → `"delivered"`, `"undelivered"` → `"failed"`, `"failed"` → `"failed"`, `"sent"` → `"sent"`
3. `UPDATE messages SET status = $1 WHERE provider_message_id = $2 AND status != 'delivered'`
4. Respond `200 OK`

---

## Resend (Email)

**Route**: `POST /api/webhooks/resend`

### Signature validation

- Header: `svix-id`, `svix-timestamp`, `svix-signature`
- Use Svix SDK (bundled with Resend): `wh.verify(raw_body, headers)`
- Use `RESEND_WEBHOOK_SECRET` from env. Return `403` if invalid.

**Event payload**:

```json
{
  "type": "email.delivered",
  "data": {
    "email_id": "resend-msg-id-abc",
    "to": ["client@example.com"]
  }
}
```

**Handler logic**:
1. Validate signature
2. Map Resend event type → Klyro status:
   - `email.delivered` → `"delivered"`
   - `email.bounced` → `"failed"`
   - `email.complained` → `"failed"`
   - Other event types: ignore, respond `200`
3. `UPDATE messages SET status = $1 WHERE provider_message_id = $2 AND status != 'delivered'`
4. Respond `200 OK`

---

## Common principles for all webhooks

- **Respond fast**: All three providers require a response within 20–30 seconds or they retry. Offload any heavy processing; the DB update is the only work done synchronously.
- **Idempotent**: The `AND status != 'delivered'` guard on the UPDATE prevents a delivered message from being downgraded by a late `sent` event.
- **No session required**: Webhooks are server-to-server; they do not carry user sessions.
- **No HATEOAS required**: Webhook handlers return plain `200` or error codes — they are not client-facing APIs.
- **PII**: Never log the message body or recipient phone/email. Log only `(messageId, channel, newStatus)`.
