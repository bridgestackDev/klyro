# Feature Specification: Automated Appointment Messaging

**Feature Branch**: `001-automated-messaging`

**Created**: 2026-05-28

**Status**: Draft

**Input**: Automated confirmation, reminder, and cancellation messages sent to clients when appointments are created, upcoming, or cancelled — with content adapted by business vertical and client language.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Client Receives Confirmation After Booking (Priority: P1)

A client books an appointment through a business's public booking link. Within seconds of the booking being confirmed, they receive a message on their preferred channel containing the appointment date, time, the staff member's name, the branch address, and a way to cancel.

**Why this priority**: This is the most immediate, highest-frequency touchpoint of the feature. Every booking produces a confirmation. It is also the primary trust signal that the booking was received — without it, clients call or message the business to verify, which is the exact friction Klyro removes.

**Independent Test**: Book an appointment on any public booking link and verify that a confirmation message arrives within 5 seconds on the configured channel, containing all required appointment data and a cancel option.

**Acceptance Scenarios**:

1. **Given** a business has WhatsApp configured as their primary channel, **When** a client completes a booking, **Then** the client receives a WhatsApp message within 5 seconds containing the appointment date, time, staff member name, branch address, and a cancellation option.
2. **Given** a client's browser is in English, **When** a booking is confirmed, **Then** the confirmation message is delivered in English with vocabulary appropriate to the business vertical.
3. **Given** a client's browser is in Spanish, **When** a booking is confirmed, **Then** the confirmation message is delivered in Spanish with vertical-appropriate tone.
4. **Given** a barbershop booking, **When** the confirmation is sent, **Then** the message uses a casual, direct tone (e.g., "¡Tu corte está confirmado! Te esperamos.").
5. **Given** a spa booking, **When** the confirmation is sent, **Then** the message uses a calm, wellness tone appropriate to the vertical.
6. **Given** a fitness/personal training booking, **When** the confirmation is sent, **Then** the message uses a motivational tone appropriate to the vertical.

---

### User Story 2 — Client Receives 24-Hour Reminder (Priority: P2)

A client who booked an appointment receives a reminder message exactly 24 hours before their appointment start time. The reminder contains the same key appointment details so the client can verify and prepare.

**Why this priority**: This is the core no-show-reduction mechanism. The hypothesis the feature must validate is that automated, timely reminders reduce no-shows. The 24-hour reminder is the primary intervention.

**Independent Test**: Create a booking with a start time 25+ hours in the future. Verify that at the 24-hour mark a reminder message is delivered containing the appointment date, time, staff name, and branch address on the client's configured channel.

**Acceptance Scenarios**:

1. **Given** an upcoming appointment 24 hours away, **When** the reminder window is reached, **Then** the client receives a reminder message on their configured channel with the appointment date, time, staff name, and branch.
2. **Given** an appointment that was cancelled before the 24-hour mark, **When** the reminder window is reached, **Then** no reminder is sent.
3. **Given** a reminder message already sent, **When** the appointment is later cancelled, **Then** no further reminder is sent (the cancellation message covers the update).
4. **Given** the preferred channel is unavailable at reminder time, **When** the reminder is due, **Then** the system falls back to the next available channel in priority order (WhatsApp → SMS → Email).

---

### User Story 3 — Client Receives Cancellation Message (Priority: P3)

When a client cancels their appointment — either through the cancel option in a confirmation or reminder message, or through any other cancellation path — they receive a cancellation confirmation message acknowledging the appointment is no longer active.

**Why this priority**: Closes the communication loop and reduces inbound "did my cancellation go through?" messages to the business owner. Depends on the confirmation message being in place first.

**Independent Test**: Cancel an existing appointment and verify a cancellation message is delivered to the client on their configured channel within a reasonable time, with tone matching the business vertical and language matching the client's preference.

**Acceptance Scenarios**:

1. **Given** an active appointment, **When** the client cancels via the link in their confirmation message, **Then** a cancellation confirmation message is sent to the client on their channel.
2. **Given** a cancellation message sent, **When** the owner views the appointment in the dashboard, **Then** the cancellation message appears with a delivered or sent status.
3. **Given** a spa vertical appointment is cancelled, **Then** the cancellation message uses the spa wellness tone, not a generic message.

---

### User Story 4 — Owner Sees Message Delivery Status Per Appointment (Priority: P2)

A business owner viewing an appointment in the dashboard can see whether each automated message (confirmation, reminder, cancellation) was sent, delivered, or failed. Status updates arrive asynchronously from the messaging provider and reflect the true state at the time of viewing.

**Why this priority**: Without visibility into delivery status, owners cannot diagnose no-shows caused by failed messages or act on failures proactively. This is also the measurement surface that proves or disproves the no-show reduction hypothesis.

**Independent Test**: Open any appointment in the owner dashboard and verify that the message status panel shows each message type, its current status (pending / sent / delivered / failed), and the timestamp of the last status update.

**Acceptance Scenarios**:

1. **Given** a confirmation message was sent successfully, **When** the owner views the appointment, **Then** the confirmation row shows status "sent" with a timestamp.
2. **Given** the messaging provider reports delivery, **When** the delivery webhook is received, **Then** the appointment's confirmation status updates to "delivered" without a page refresh.
3. **Given** a message send attempt failed, **When** the owner views the appointment, **Then** the message row shows status "failed" and the failure is distinguishable from pending or in-transit states.
4. **Given** the owner views an appointment that hasn't reached its reminder window yet, **Then** the reminder message row shows status "pending" or "scheduled."

---

### User Story 5 — Channel Fallback When Primary Is Unavailable (Priority: P3)

When the highest-priority channel configured for a business cannot deliver a message (e.g., the client provided no WhatsApp number), the system automatically tries the next available channel in the priority order: WhatsApp → SMS → Email.

**Why this priority**: Ensures maximum message delivery coverage without requiring the owner to manually intervene. Depends on confirmation and reminder being in place.

**Independent Test**: Configure a business with WhatsApp as primary. Create a booking for a client with no WhatsApp number but with a valid email address. Verify the confirmation arrives via email.

**Acceptance Scenarios**:

1. **Given** WhatsApp is the primary channel and the client has no WhatsApp number, **When** a confirmation is triggered, **Then** the system attempts SMS delivery.
2. **Given** WhatsApp and SMS are both unavailable, **When** a confirmation is triggered, **Then** the system attempts email delivery.
3. **Given** no channels are available for the client, **When** a message is triggered, **Then** the message is recorded as failed with a reason, and the owner can see this in the appointment status view.

---

### Edge Cases

- What happens when a booking is made less than 24 hours before the appointment start time? The reminder is not sent (the appointment starts before the 24-hour window). The confirmation is still sent immediately.
- What happens when the same appointment is cancelled and immediately re-created (rescheduled)? The cancellation message is sent for the first booking; the new booking triggers a fresh confirmation and schedules a new reminder.
- What happens when a message is in flight and the appointment is cancelled? The reminder (if not yet sent) is cancelled. Messages already sent are not recalled.
- What happens when the messaging provider is temporarily unreachable? The message is marked as failed. No automatic retry is required in v1 — the owner sees the failure status and can take manual action.
- What happens when a client has no contact information on file? The message cannot be sent; the appointment is flagged with a "no contact" status rather than "failed."
- What happens when the business owner has not configured any messaging channels? Messages are not sent; the appointment status shows "messaging not configured."

---

## Requirements *(mandatory)*

### Functional Requirements

**Confirmation Message**

- **FR-001**: The system MUST send a confirmation message to the client within 5 seconds of a booking being successfully created.
- **FR-002**: The confirmation message MUST include: appointment date (formatted for the business's locale), appointment start time, staff member's display name, branch address, and a mechanism for the client to cancel the appointment.
- **FR-003**: The confirmation message MUST be written in the client's detected preferred language (Spanish or English).
- **FR-004**: The confirmation message MUST use tone and vocabulary appropriate to the business vertical (barbershop: casual and direct; spa: calm wellness; fitness: motivational; salon, tattoo, car wash, pet grooming, generic: vertical-appropriate equivalents).

**Reminder Message**

- **FR-005**: The system MUST send a reminder message to the client exactly 24 hours before the scheduled appointment start time, within a tolerance of ±5 minutes.
- **FR-006**: The reminder MUST include: appointment date, start time, staff member's display name, and branch address.
- **FR-007**: If an appointment is cancelled before its 24-hour reminder window, the system MUST NOT send the reminder.
- **FR-008**: If an appointment is created with a start time less than 24 hours in the future, no reminder is sent for that appointment.

**Cancellation Message**

- **FR-009**: The system MUST send a cancellation message to the client when an appointment transitions to a cancelled state.
- **FR-010**: The cancellation message MUST acknowledge that the appointment is no longer active and use vertical-appropriate tone.

**Channel Selection**

- **FR-011**: The system MUST attempt message delivery in this priority order: (1) WhatsApp, (2) SMS, (3) Email — skipping any channel for which the client lacks valid contact information or the business has not activated.
- **FR-012**: If all available channels fail or are unavailable, the message MUST be recorded as failed with a reason, and the status MUST be visible to the owner.

**Message Content**

- **FR-013**: All message content MUST be drawn from predefined templates keyed by the combination of: message type (confirmation / reminder / cancellation), business vertical, client language, and channel.
- **FR-014**: Templates MUST NOT be editable by the business owner in v1. Template content is managed by the platform.
- **FR-015**: Dynamic fields within templates (date, time, staff name, branch address) MUST be populated from the appointment record at send time.

**Delivery Status**

- **FR-016**: Each message attempt MUST be persisted with a status of: pending, sent, delivered, or failed.
- **FR-017**: The system MUST accept asynchronous delivery status updates from the messaging provider and update the stored status accordingly.
- **FR-018**: The business owner MUST be able to view the delivery status of each message type (confirmation, reminder, cancellation) for any individual appointment from the owner dashboard.

**Out of Scope (v1)**

- Marketing or promotional messages of any kind.
- Bulk messaging to multiple clients simultaneously.
- Two-way conversational replies beyond accepting a cancel keyword or cancel link action.
- Owner-configurable message scheduling (e.g., send reminder 48 hours instead of 24).
- Owner-authored or owner-edited message templates.

---

### Key Entities

- **Message**: A single message instance linked to one appointment. Has a type (confirmation / reminder / cancellation), channel (WhatsApp / SMS / Email), status (pending / sent / delivered / failed), scheduled time, sent time, provider message ID, and failure reason if applicable.
- **Message Template**: Predefined content identified by the combination of message type, business vertical, client language, and channel. Contains a body with named placeholders for dynamic fields (date, time, staff name, address, cancel link).
- **Appointment**: The booking record that triggers all messaging. Has a start time, status (active / cancelled / completed), linked client, linked staff member, and linked branch.
- **Client**: The person receiving messages. Has a display name, preferred language (detected at booking time), WhatsApp number, phone number, and optional email address.
- **Business / Branch**: Has a configured set of active messaging channels and priority order. Channel configuration is set by the owner during setup wizard step 7.
- **Delivery Event**: An asynchronous event received from the messaging provider carrying a provider message ID and a status update (delivered / failed / read).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Confirmation messages are received by the client within 5 seconds of booking completion in at least 95% of successful send attempts.
- **SC-002**: Reminder messages are delivered within a ±5 minute window of the 24-hour mark in at least 98% of scheduled reminders.
- **SC-003**: Businesses using automated messaging see a measurable reduction in no-show rate compared to baseline (pre-Klyro manual messaging) — target: no-show rate below 10% for pioneer cohort within 60 days of launch.
- **SC-004**: 100% of message send attempts (success or failure) are recorded with a status visible to the business owner.
- **SC-005**: Delivery status in the owner dashboard reflects the provider's reported state within 60 seconds of the provider issuing the status event.
- **SC-006**: Channel fallback operates transparently — owners see which channel was actually used for each message, and the fallback adds no more than 10 seconds of delay to delivery.
- **SC-007**: Zero messages are sent to clients for cancelled appointments after the cancellation has been recorded in the system.

### Hypothesis Validation

The feature is considered to prove its hypothesis if, within 60 days of production use by at least five pioneer businesses:
- Measured no-show rate across those businesses is lower than the industry baseline (5–25%) — target: below 10%.
- At least 80% of owners report that automated messaging saves them time compared to their previous manual workflow.

---

## Assumptions

- The client's preferred language is captured at booking time from browser locale detection; it defaults to Spanish if no locale is detected.
- A client always provides a WhatsApp number or email address during booking — at minimum one valid contact channel is required to complete a booking.
- The business owner configures their preferred messaging channel(s) during the setup wizard (step 7: Notifications). At least one channel must be configured for messaging to function.
- The cancel mechanism delivered in messages is a unique, time-limited URL that transitions the appointment to cancelled state when visited. No password or account creation is required to cancel via the link.
- A "cancel keyword" reply (e.g., replying "CANCEL" on WhatsApp) is in scope as a basic cancel mechanism for WhatsApp channel only; it triggers the same cancellation flow as the link.
- Appointment rescheduling is treated as a cancellation of the old booking and creation of a new one — each leg sends its own messages.
- The messaging provider exposes a webhook for asynchronous delivery events (delivered, failed, read). Provider selection and API integration are implementation concerns, not part of this spec.
- The system time zone for reminder scheduling is the branch's configured time zone, not UTC.
- Templates for all 8 verticals × 2 languages × 3 channels × 3 message types (144 template combinations) are authored and seeded before feature launch.
- No retry logic is implemented in v1. A failed message remains failed and is visible to the owner for manual follow-up.
- The owner dashboard message status view is read-only in v1; owners cannot trigger resends.
