# Tasks: Automated Appointment Messaging

**Input**: Design documents from `specs/001-automated-messaging/`

**Branch**: `001-automated-messaging` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Note**: Tests are included throughout as required by the Klyro Constitution (Principle IV — Test-Driven Quality Gates). Run `pnpm typecheck && pnpm lint && pnpm test` before every commit.

---

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US#]**: Which user story this task serves
- All paths are relative to `klyro/` (the Next.js app root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new env var and verify scaffolds are clean before writing code.

- [x] T001 Add `RESEND_WEBHOOK_SECRET` to server-only schema in `src/lib/env.ts` and to `.env.example`
- [x] T002 Install `svix` package for Resend webhook signature validation: `pnpm add svix@latest`
- [x] T003 Verify `src/lib/messaging/`, `supabase/functions/`, and webhook route scaffolds are empty (`.gitkeep` only) and ready to receive code

**Checkpoint**: Environment is ready. `pnpm typecheck` passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database changes and the MessageRouter core — required by every user story before any message can be sent or received.

**⚠️ CRITICAL**: All user story work is blocked until this phase is complete.

- [x] T004 Write `supabase/migrations/0010_cancel_token.sql`: add `cancel_token uuid NOT NULL DEFAULT gen_random_uuid()` to `appointments`; extend `messages.status` check to include `'cancelled'`; UPDATE all 14 WhatsApp + 14 email `confirmation` templates to append cancel link line and add `"cancel_link"` to their `variables` array (see `data-model.md` Migration Summary for exact SQL)
- [ ] T005 Apply migration: `pnpm dlx supabase@latest db push` — verify `SELECT cancel_token FROM appointments LIMIT 1` returns a UUID and `UPDATE messages SET status='cancelled' WHERE false` runs without error
- [x] T006 [P] Create `src/lib/messaging/types.ts` — export `MessagePayload`, `ChannelResult`, `TemplateVariables`, `MessageType`, `MessageChannel`, `MessageStatus` types; no runtime dependencies
- [x] T007 Create `src/lib/messaging/variables.ts` — export `interpolate(template: string, vars: Record<string, string>): string`; replace all `{placeholder}` occurrences; throw `MissingVariableError` if a variable declared in the template is not supplied; map `{mascota}` fallback to `{nombre}` for petgrooming templates (see `data-model.md` note)
- [x] T008 Write unit tests for `variables.ts` in `tests/messaging/variables.test.ts`: happy path for each variable, missing variable throws, mascota fallback, extra variables are ignored
- [x] T009 Create `src/lib/messaging/router.ts` — `MessageRouter` class with `resolve(messageId: string): Promise<MessagePayload>`: loads message row + joins appointment/client/branch/business/staff/service; selects channel in priority order (WhatsApp → SMS → Email) based on client contact fields and branch configuration; looks up `message_templates` row by `(type, channel, language, vertical)`; builds `TemplateVariables` map (date/time formatted in branch timezone and client locale; cancel URL as `{APP_URL}/api/appointments/{id}/cancel`; booking URL for `{link}`); returns `MessagePayload` with resolved channel, template content after interpolation, and `to` address
- [x] T010 Write unit tests for `MessageRouter` in `tests/messaging/router.test.ts`: correct template selected for barbershop+es, spa+en; channel fallback when WhatsApp absent; channel fallback when WhatsApp+SMS absent; `NOT_FOUND` throws when no channel available; variable map correctness for date/time formatting

**Checkpoint**: `pnpm test tests/messaging/` passes. MessageRouter resolves templates correctly for at least 2 verticals and both languages.

---

## Phase 3: User Story 1 — Client Receives Confirmation After Booking (Priority: P1) 🎯 MVP

**Goal**: Within 5 seconds of a booking being confirmed, the client receives a message on their configured channel with date, time, staff, location, and a cancel link — using vertical-appropriate tone and the client's language.

**Independent Test**: Create a booking via `POST /api/booking/create`. Verify (a) two `messages` rows exist in the DB, (b) the confirmation row transitions from `pending` to `sent` after running the dispatch Edge Function, (c) the message content matches the correct vertical+language template with all variables populated.

- [x] T011 [P] [US1] Create `src/lib/messaging/channels/whatsapp.ts` — `sendWhatsApp(to: string, body: string): Promise<ChannelResult>`: call Meta Cloud API `POST /v18.0/{WHATSAPP_PHONE_NUMBER_ID}/messages` with `type: "text"`; return `{ success, providerMessageId, error? }`; use `WHATSAPP_ACCESS_TOKEN` from env; log `(messageId, channel, status)` without logging body
- [x] T012 [P] [US1] Create `src/lib/messaging/channels/sms.ts` — `sendSMS(to: string, body: string): Promise<ChannelResult>`: use Twilio REST via `twilio` SDK; format `to` phone number via `libphonenumber-js` before sending; return `ChannelResult`; log without PII
- [x] T013 [P] [US1] Create `src/lib/messaging/channels/email.tsx` — `sendEmail(to: string, subject: string, body: string, businessName: string): Promise<ChannelResult>`: wrap template body in a minimal React Email layout component with business name header; call Resend SDK `emails.send()`; return `ChannelResult`
- [x] T014 [US1] Write unit tests for all three channel adapters in `tests/messaging/channels.test.ts`: mock HTTP/SDK calls; success case returns `providerMessageId`; provider error returns `{ success: false, error }`; Twilio phone formatting; React Email renders without crashing
- [x] T015 [US1] Create `src/lib/messaging/schedule.ts` — `scheduleMessages(appointmentId: string, startsAt: string, businessId: string): Promise<void>`: insert `messages` row for confirmation (`scheduled_at = now()`); insert `messages` row for reminder_24h (`scheduled_at = new Date(startsAt) - 24h`) ONLY if `startsAt - now() > 24 hours`; derive channel from `branches.whatsapp_number` presence for the `channel` field; both rows get `status = 'pending'`; use `createAdminClient()` (same as booking/create)
- [x] T016 [US1] Write unit tests for `scheduleMessages` in `tests/messaging/schedule.test.ts`: creates 2 rows for far-future booking; creates 1 row (no reminder) for booking within 24h; correct `scheduled_at` values; DB insert failures are thrown not swallowed
- [x] T017 [US1] Update `src/app/api/booking/create/route.ts`: call `scheduleMessages(appt.id, appt.starts_at, branch.business_id)` after the successful appointment insert; wrap in try/catch — a messaging failure must NOT fail the booking response (log the error, return 201 anyway)
- [x] T018 [US1] Create `supabase/functions/dispatch-due-messages/index.ts` (Deno): authenticate with `SUPABASE_SERVICE_ROLE_KEY`; query `SELECT id FROM messages WHERE status = 'pending' AND scheduled_at <= now() ORDER BY scheduled_at LIMIT 100`; for each message call `MessageRouter.resolve()` then the correct channel adapter; on success: `UPDATE messages SET status='sent', provider_message_id=$1, sent_at=now() WHERE id=$2`; on error: `UPDATE messages SET status='failed', error=$1 WHERE id=$2`; process serially; respond 200 with `{ dispatched: N, failed: M }`
- [x] T019 [US1] Manual smoke test per `quickstart.md` Steps 1–4: confirm a test booking creates 2 message rows and the dispatch Edge Function transitions the confirmation to `sent`

**Checkpoint (US1 MVP)**: A real booking sends a real WhatsApp confirmation within 5 seconds of dispatch. US1 is independently functional.

---

## Phase 4: User Story 2 — Client Receives 24-Hour Reminder (Priority: P2)

**Goal**: At the 24-hour mark before any confirmed appointment, the client receives a reminder message. If the appointment is created within 24 hours of start time, no reminder is sent.

**Independent Test**: Create a booking 25+ hours in future. Manually advance `scheduled_at` on the reminder row to `now()`. Run dispatch. Verify the reminder message reaches the client with correct content.

- [x] T020 [US2] Verify reminder `scheduled_at` calculation in `scheduleMessages`: add assertion in existing tests (`tests/messaging/schedule.test.ts`) that the reminder row's `scheduled_at` equals `new Date(startsAt).getTime() - 24 * 60 * 60 * 1000` within ±1 second
- [x] T021 [US2] Verify `dispatch-due-messages` Edge Function handles `type = 'reminder_24h'` correctly: ensure `MessageRouter.resolve()` picks the `reminder_24h` template variant (not the `confirmation` template); add a specific test case in `tests/messaging/router.test.ts` for reminder template resolution
- [x] T022 [US2] Verify reminder template variables — confirm `reminder_24h` templates for all 7 verticals use only variables present in `TemplateVariables` map (cross-check `message_templates.variables` jsonb arrays against the variable map in `router.ts`); document any mismatches as a migration fix

**Checkpoint (US2)**: A scheduled reminder at the 24h mark dispatches correctly and contains the right content. US1 and US2 are both independently functional.

---

## Phase 5: User Story 4 — Owner Sees Message Delivery Status (Priority: P2)

**Goal**: For each appointment, the owner can see in the dashboard whether each message was sent, delivered, or failed — and the status updates live without a page refresh.

**Independent Test**: Open an appointment in the dashboard. Send a mock webhook delivery event. Verify the status badge updates within 60 seconds without refresh.

- [x] T023 [P] [US4] Implement `src/app/api/webhooks/whatsapp/route.ts`: `GET` handler returns `hub.challenge` if `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`; `POST` handler validates `X-Hub-Signature-256` header using `HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET)` with timing-safe comparison (return 403 on mismatch); parse `entry[].changes[].value.statuses[]`; map Meta status to Klyro status; `UPDATE messages SET status=$1 WHERE provider_message_id=$2 AND status != 'delivered'`; respond 200 immediately
- [x] T024 [P] [US4] Implement `src/app/api/webhooks/twilio/route.ts`: validate Twilio signature using `twilio` SDK `validateRequest(TWILIO_AUTH_TOKEN, signature, url, params)` (return 403 on mismatch); parse form-encoded body for `MessageSid` and `MessageStatus`; map to Klyro status; update `messages` row; respond 200
- [x] T025 [P] [US4] Implement `src/app/api/webhooks/resend/route.ts`: validate signature via `svix` `Webhook.verify(rawBody, headers)` using `RESEND_WEBHOOK_SECRET` (return 403 on mismatch); parse `type` field (`email.delivered` → `delivered`, `email.bounced`/`email.complained` → `failed`); update `messages` row; ignore unknown event types with 200
- [x] T026 [US4] Write unit tests for all three webhook handlers in `tests/messaging/webhooks.test.ts`: valid signature + correct status update; invalid signature returns 403; idempotency guard (delivered → sent does not downgrade); unknown event type returns 200 without DB write
- [x] T027 [US4] Create `src/app/api/appointments/[id]/messages/route.ts` (authenticated GET): validate session via server Supabase client; query `messages WHERE appointment_id = $1` — RLS enforces business isolation; return `{ data: [...], _links }` per `contracts/message-status-endpoint.md`; add `@openapi` JSDoc block with `@tag Messaging`
- [x] T028 [US4] Create `src/components/dashboard/messaging/MessageStatusPanel.tsx`: fetch initial data from `/api/appointments/{id}/messages`; subscribe to Supabase Realtime `postgres_changes` on `messages` filtered by `appointment_id`; render a status row per message type (confirmation / reminder_24h / cancellation) with status badge (design token colors: `text-success` for delivered, `text-warning` for pending/sent, `text-danger` for failed/cancelled), channel icon, and sent_at timestamp; handle `pending` state with no timestamp shown
- [x] T029 [US4] Wire `MessageStatusPanel` into the appointment detail drawer/sheet in `src/app/[locale]/(dashboard)/agenda/` — pass `appointmentId` prop; use design tokens, no raw hex
- [x] T030 [US4] Add i18n strings for `MessageStatusPanel` to `src/i18n/locales/es.json` and `src/i18n/locales/en.json`: message type labels, status labels, channel labels, "no messages" empty state

**Checkpoint (US4)**: Owner opens an appointment, sees the message status panel, and the badge updates live when a webhook arrives. US4 is independently functional.

---

## Phase 6: User Story 3 — Client Receives Cancellation Message + User Story 5 — Channel Fallback (Priority: P3)

**Goal (US3)**: When a client cancels via the link in their confirmation message, the appointment is cancelled and a cancellation message is sent. **Goal (US5)**: When the primary channel (WhatsApp) is unavailable, the system silently falls back to SMS → Email.

**Independent Test (US3)**: Cancel an existing appointment using the cancel endpoint with a valid token. Verify appointment status changes, pending reminder is cancelled, and a cancellation message is dispatched.

**Independent Test (US5)**: Create a test client with no `whatsapp_number` but with an email address. Create a booking. Run dispatch. Verify the confirmation arrives via email, not WhatsApp.

- [x] T031 [US3] Create `src/app/api/appointments/[id]/cancel/route.ts` (public POST): parse body with `cancelAppointmentSchema` (Zod: `{ token: z.string().uuid() }`); apply rate limiter (reuse `getBookingLimiter` pattern); query appointment by `id` using `createAdminClient()`; return 404 if not found or `cancel_token` does not match (timing-safe comparison); return 409 if status is already `cancelled`, `completed`, or `noshow`; in a single DB transaction: set `appointments.status = 'cancelled'`, `cancelled_at = now()`; `UPDATE messages SET status='cancelled', error='appointment_cancelled' WHERE appointment_id=$1 AND type='reminder_24h' AND status='pending'`; insert `messages` row: `type='cancellation'`, `status='pending'`, `scheduled_at=now()`; return 200 per `contracts/cancel-endpoint.md`; add `@openapi` JSDoc block with `@tag Appointments`
- [x] T032 [US3] Write unit tests for cancel endpoint in `tests/messaging/cancel.test.ts`: valid token cancels appointment + cancels reminder + creates cancellation message; wrong token returns 404; already-cancelled returns 409; rate limit exceeded returns 429; missing token returns 400
- [x] T033 [US5] Add channel fallback unit tests to `tests/messaging/router.test.ts`: client with no `whatsapp_number` → SMS selected; client with no `whatsapp_number` and no `phone` → email selected; client with no contact channels → throws `NoChannelAvailableError`; verify `MessagePayload.channel` reflects the fallback channel used
- [x] T034 [US3] [US5] Manual smoke test per `quickstart.md` Steps 5–6: cancel via endpoint; verify reminder is `cancelled` and cancellation message dispatches; also test with a no-WhatsApp client and confirm email delivery

**Checkpoint (US3 + US5)**: Cancellation flow works end-to-end. Channel fallback is verified. All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI documentation, E2E tests across two verticals (constitution requirement), and final validation.

- [x] T035 [P] Run `pnpm openapi:gen` and commit updated `public/openapi.json` after T027 and T031 (two new routes with `@openapi` blocks)
- [x] T036 [P] Write Playwright E2E test for barbershop vertical: full booking flow → confirm 2 message rows created → dispatch → confirm `sent` status in `tests/e2e/messaging-barbershop.spec.ts`
- [x] T037 [P] Write Playwright E2E test for fitness vertical: same flow as T036 in `tests/e2e/messaging-fitness.spec.ts` (constitution requires ≥ 2 distinct verticals in E2E suite)
- [x] T038 Run full test suite: `pnpm typecheck && pnpm lint && pnpm test` — resolve any failures
- [x] T039 Run quickstart.md end-to-end (Steps 1–7) against the dev server to validate the complete feature in a real environment

**Checkpoint (Done)**: All 39 tasks complete, test suite green, two-vertical E2E coverage confirmed, OpenAPI docs updated. Feature is ready for a single commit per block (follow plan.md block boundaries for commit grouping).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Requires Phase 2 — P1 priority, do this first
- **Phase 4 (US2)**: Requires Phase 3 — shares all infrastructure with US1
- **Phase 5 (US4)**: Requires Phase 2 — can be worked in parallel with Phase 3 by a second developer
- **Phase 6 (US3+US5)**: Requires Phase 3 (cancel_token must exist in appointments) and Phase 2 (router for channel fallback)
- **Phase 7 (Polish)**: Requires all story phases complete

### User Story Dependencies

- **US1 (P1)**: Phase 2 complete → implement
- **US2 (P2)**: US1 complete → verify and test (shares all infrastructure)
- **US4 (P2)**: Phase 2 complete → can run in parallel with US1
- **US3 (P3)**: US1 complete (needs cancel_token + scheduleMessages pattern)
- **US5 (P3)**: Phase 2 complete (router fallback logic is in T009)

### Within Each Phase

- `[P]`-marked tasks within a phase can run simultaneously (different files)
- Types (T006) → Variables (T007) → Router (T009) is a strict serial dependency chain
- Channel adapters (T011–T013) are independent of each other
- Webhooks (T023–T025) are independent of each other

---

## Parallel Opportunities

### Phase 2 Foundational
```
T006 types.ts (no deps)        → unblocks T007, T009
T007 variables.ts              → unblocks T008, T009
T009 router.ts                 → unblocks T010, T015, T018
```

### Phase 3 — US1
```
T011 whatsapp.ts   (parallel)
T012 sms.ts        (parallel)   → all feed into T018 (Edge Function)
T013 email.tsx     (parallel)
T014 channel tests (parallel with T015)
```

### Phase 5 — US4
```
T023 whatsapp webhook  (parallel)
T024 twilio webhook    (parallel)   → all feed into T026 (tests)
T025 resend webhook    (parallel)
```

---

## Parallel Example: Phase 3 (US1)

```bash
# Run all three channel adapter tasks simultaneously (different files):
Task: "T011 Create src/lib/messaging/channels/whatsapp.ts"
Task: "T012 Create src/lib/messaging/channels/sms.ts"
Task: "T013 Create src/lib/messaging/channels/email.tsx"
# Then after all three complete:
Task: "T014 Write unit tests for all three channel adapters"
Task: "T015 Create src/lib/messaging/schedule.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Phases 1–3)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T010) — **critical path**
3. Complete Phase 3: US1 Confirmation (T011–T019)
4. **STOP and VALIDATE**: A booking sends a real WhatsApp confirmation. No-show risk drops for pilot businesses.
5. Deploy to staging / demo to pioneer businesses

### Incremental Delivery

1. Phases 1–3 → **Confirmation working** (MVP proof-of-concept)
2. Phase 4 → **Reminder working** (no-show reduction hypothesis activatable)
3. Phase 5 → **Delivery status visible** (owner trust and monitoring)
4. Phase 6 → **Cancellation working** (full loop closed)
5. Phase 7 → **Production-ready** (E2E coverage, OpenAPI docs)

### Commit Strategy (per CLAUDE.md block rule)

Each plan.md implementation block = one commit:
- **Block 1 commit**: T004–T005 (migration) + T015–T016 (schedule.ts) + T017 (booking/create update)
- **Block 2 commit**: T006–T010 (types, variables, router)
- **Block 3 commit**: T011–T014 (channel adapters)
- **Block 4 commit**: T018–T019 (Edge Function)
- **Block 5 commit**: T023–T026 (webhooks)
- **Block 6 commit**: T027–T032 + T033–T034 (cancel endpoint + US5 fallback tests)
- **Block 7 commit**: T028–T030 + T035–T039 (dashboard UI + polish)

---

## Notes

- `[P]` = safe to run in parallel (different files, no shared in-progress dependencies)
- `[US#]` = user story traceability — links to `spec.md` user stories
- Constitution Principle IV requires tests alongside implementation — test tasks are mandatory, not optional
- Never log PII (client phone, email, name) in any messaging code — log only `(messageId, channel, status)`
- `business_id` must never come from client input — always derive from DB join
- Use `createAdminClient()` in server-side contexts that don't have a user session (Edge Function, cancel endpoint)
- Run `pnpm openapi:gen` whenever a new route with `@openapi` JSDoc is added (T027, T031 trigger this)
