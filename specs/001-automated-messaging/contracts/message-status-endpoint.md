# API Contract: Appointment Message Status

**Route**: `GET /api/appointments/{id}/messages`

**Auth**: Required (Supabase session cookie). RLS ensures the owner only sees messages for their own business's appointments.

**OpenAPI tag**: `Messaging`

---

## Request

```
GET /api/appointments/{id}/messages
Authorization: (session cookie — handled by Supabase SSR middleware)
```

### Path parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `uuid` | Yes | Appointment ID |

---

## Responses

### 200 — Success

```json
{
  "data": [
    {
      "id": "msg-uuid-1",
      "type": "confirmation",
      "channel": "whatsapp",
      "status": "delivered",
      "scheduledAt": "2026-05-28T14:00:00Z",
      "sentAt": "2026-05-28T14:00:03Z",
      "providerMessageId": "wamid.abc123"
    },
    {
      "id": "msg-uuid-2",
      "type": "reminder_24h",
      "channel": "whatsapp",
      "status": "pending",
      "scheduledAt": "2026-05-29T14:00:00Z",
      "sentAt": null,
      "providerMessageId": null
    }
  ],
  "_links": {
    "self": { "href": "/api/appointments/{id}/messages", "method": "GET" },
    "appointment": { "href": "/api/appointments/{id}", "method": "GET" }
  }
}
```

**Status values**: `pending`, `sent`, `delivered`, `failed`, `cancelled`

### 401 — No session

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required." } }
```

### 404 — Appointment not found or not owned by session business

```json
{ "error": { "code": "NOT_FOUND", "message": "Appointment not found." } }
```

---

## Notes

- This endpoint is called by the `MessageStatusPanel` component to populate the initial state.
- Subsequent live updates are delivered via Supabase Realtime (`postgres_changes` on `messages` table filtered by `appointment_id`), not by polling this endpoint.
- The response always returns all message rows for the appointment in chronological order by `scheduled_at`.
- `error` field from the DB row (failure reason) is intentionally excluded from this response to avoid leaking provider internals. The dashboard shows a generic "Failed" badge.
