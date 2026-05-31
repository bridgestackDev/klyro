# Data Model: Automated Appointment Messaging

**Branch**: `001-automated-messaging` | **Date**: 2026-05-28

---

## Existing Tables (no schema changes except as noted)

### `messages` (existing — one change)

Stores every message attempt. One row per message per appointment per type.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `appointment_id` | `uuid` FK → appointments | CASCADE delete |
| `business_id` | `uuid` FK → businesses | For RLS scoping |
| `type` | `text` | `confirmation`, `reminder_24h`, `cancellation` |
| `channel` | `text` | `whatsapp`, `sms`, `email` |
| `status` | `text` | `pending` → `sent` → `delivered` or `failed`; also `cancelled` (**NEW**) |
| `provider_message_id` | `text` | Set on successful send; used to correlate webhook events |
| `scheduled_at` | `timestamptz` | When to dispatch. Confirmation = `now()`, reminder = `starts_at - 24h` |
| `sent_at` | `timestamptz` | Set when dispatch succeeds |
| `error` | `text` | Set on `failed` or `cancelled`; reason string |
| `created_at` | `timestamptz` | |

**Index** (existing): `idx_messages_scheduled` on `(status, scheduled_at)` where `status = 'pending'`

**Status lifecycle**:
```
pending → sent → delivered
                → failed (provider rejected)
pending → failed (dispatch error, no provider message id)
pending → cancelled (appointment cancelled before dispatch)
```

**Change in migration `0010`**: Add `'cancelled'` to the `status` check constraint.

---

### `appointments` (existing — one column added)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `business_id` | `uuid` FK | |
| `branch_id` | `uuid` FK | |
| `client_id` | `uuid` FK | |
| `staff_id` | `uuid` FK | |
| `service_id` | `uuid` FK | |
| `starts_at` | `timestamptz` | Used to compute reminder `scheduled_at` |
| `ends_at` | `timestamptz` | |
| `status` | `text` | `pending`, `confirmed`, `completed`, `noshow`, `cancelled` |
| `booking_code` | `text` | `KLY-XXXX` format |
| `cancel_token` | `uuid` | **NEW** — `default gen_random_uuid()`, used to authenticate cancel requests |
| `notes` | `text` | |
| `created_at` | `timestamptz` | |
| `cancelled_at` | `timestamptz` | Set when status transitions to `cancelled` |

**Change in migration `0010`**: Add `cancel_token uuid not null default gen_random_uuid()`.

---

### `message_templates` (existing — content updated for cancel_link)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `type` | `text` | `confirmation`, `reminder_24h`, `cancellation` |
| `channel` | `text` | `whatsapp`, `email` |
| `language` | `text` | `es`, `en` |
| `vertical` | `text` | Registry key |
| `content` | `text` | Body with `{placeholder}` variables |
| `variables` | `jsonb` | Array of variable names used in this template |
| `is_active` | `boolean` | |

**Unique constraint**: `(type, channel, language, vertical)`

**Change in migration `0010`**: All 14 `confirmation` templates (7 verticals × WhatsApp + Email) get `{cancel_link}` appended to content and added to `variables` array.

---

### `clients` (no changes — read-only by this feature)

Key fields read at dispatch time:
- `preferred_language` — determines template language selection
- `whatsapp_number` — primary channel
- `phone` — SMS fallback
- `email` — email fallback

---

## Entity Relationships for Dispatch

```
appointment
  ├─ branch (→ business) — provides: vertical, timezone, whatsapp_number configured
  ├─ client — provides: preferred_language, whatsapp_number, phone, email
  ├─ staff — provides: display_name
  ├─ service — provides: name (used in template variables for some verticals)
  └─ messages (1:N)
        ├─ confirmation (status=pending, scheduled_at=now)
        ├─ reminder_24h (status=pending, scheduled_at=starts_at-24h)
        └─ cancellation (status=pending, scheduled_at=now — created on cancel)
```

---

## Template Variable Map

The `MessageRouter` builds this variable map at dispatch time. Not all variables are used by every template — the `variables` jsonb array on `message_templates` declares which ones are required.

| Variable | Source | Notes |
|----------|--------|-------|
| `{nombre}` | `clients.full_name` | Client first name (full name if no space) |
| `{fecha}` | `appointments.starts_at` | Formatted in branch timezone + client language locale |
| `{hora}` | `appointments.starts_at` | Time portion, formatted with AM/PM or 24h per locale |
| `{staff}` | `staff.display_name` | |
| `{servicio}` | `services.name` | Service name |
| `{dirección}` | `branches.address` | Branch address string |
| `{sucursal}` | `branches.name` | Branch name (used in carwash templates) |
| `{negocio}` | `businesses.name` | Business name |
| `{mascota}` | *(not in DB)* | Pet name — see note below |
| `{cancel_link}` | Generated | `{APP_URL}/api/appointments/{id}/cancel?confirm=1` — token passed in POST body via deep link |
| `{link}` | Generated | Booking page URL: `{APP_URL}/{business.slug}` |

> **Note on `{mascota}`**: Pet grooming templates use `{mascota}` (pet name) which is not stored in the current schema. In v1, `{mascota}` will be replaced with the client's full name as a fallback ("La cita de {nombre} está confirmada…"). A pet name field on clients is a v2 enhancement. This fallback is documented in the variables resolver.

---

## Migration Summary (0010)

```sql
-- 1. Add cancel_token to appointments
ALTER TABLE appointments
  ADD COLUMN cancel_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2. Add 'cancelled' to messages status check
ALTER TABLE messages
  DROP CONSTRAINT messages_status_check,
  ADD CONSTRAINT messages_status_check
    CHECK (status IN ('pending','sent','delivered','failed','cancelled'));

-- 3. Add cancel_link to all confirmation templates
-- (14 updates: 7 verticals × 2 channels, both languages)
UPDATE message_templates
  SET content = content || E'\nCancelar: {cancel_link}',
      variables = variables || '["cancel_link"]'
WHERE type = 'confirmation' AND channel = 'whatsapp' AND language = 'es';

UPDATE message_templates
  SET content = content || E'\nCancel: {cancel_link}',
      variables = variables || '["cancel_link"]'
WHERE type = 'confirmation' AND channel = 'whatsapp' AND language = 'en';

-- Email confirmations get a footer section (handled per-template in the migration SQL)
-- ... (7 vertical × email × 2 language UPDATE statements)
```

Full SQL in `supabase/migrations/0010_cancel_token.sql`.
