# API Contract: Cancel Appointment

**Route**: `POST /api/appointments/{id}/cancel`

**Auth**: None (public endpoint). Authenticated via `cancel_token` in the request body.

**OpenAPI tag**: `Appointments`

---

## Request

```
POST /api/appointments/{id}/cancel
Content-Type: application/json
```

### Path parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `uuid` | Yes | Appointment ID |

### Body

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `uuid` | Yes | Cancel token from the confirmation message |

### Zod schema

```typescript
const cancelAppointmentSchema = z.object({
  token: z.string().uuid(),
});
```

---

## Responses

### 200 — Cancelled successfully

```json
{
  "data": {
    "id": "a1b2c3d4-...",
    "status": "cancelled",
    "cancelledAt": "2026-05-28T18:30:00Z"
  },
  "_links": {
    "self": { "href": "/api/appointments/a1b2c3d4-.../cancel", "method": "POST" },
    "book": { "href": "/api/booking/create", "method": "POST" }
  }
}
```

### 400 — Validation error

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid UUID format", "field": "token" }
}
```

### 404 — Appointment not found or token mismatch

```json
{
  "error": { "code": "NOT_FOUND", "message": "Appointment not found or token invalid." }
}
```

> Deliberately ambiguous: never reveal whether the appointment exists or the token was wrong.

### 409 — Already cancelled or completed

```json
{
  "error": { "code": "BOOKING_CONFLICT", "message": "This appointment has already been cancelled." }
}
```

### 429 — Rate limited

```json
{
  "error": { "code": "RATE_LIMITED", "message": "Too many requests. Please try again later." }
}
```

---

## Side effects

On success, the handler MUST:
1. Set `appointments.status = 'cancelled'` and `appointments.cancelled_at = now()`
2. Update any `messages` rows for this appointment where `status = 'pending'` and `type = 'reminder_24h'` → set `status = 'cancelled'`, `error = 'appointment_cancelled'`
3. Insert a new `messages` row: `type = 'cancellation'`, `status = 'pending'`, `scheduled_at = now()`

---

## Rate limiting

5 requests per minute per IP (same limiter infrastructure as `POST /api/booking/create`).

---

## Security notes

- The `cancel_token` is a 122-bit random UUID. It is NOT exposed in URL query params (to keep it out of server access logs). It is in the POST body only.
- The endpoint returns `404` for both "appointment not found" and "wrong token" — prevents enumeration.
- The endpoint does not require a session. It is intentionally public so clients can cancel without creating an account.
- The `cancel_token` is single-use in the sense that once an appointment is `cancelled`, further calls return `409`.
