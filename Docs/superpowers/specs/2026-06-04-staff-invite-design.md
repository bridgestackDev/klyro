# Staff Email Invite + Accept Linking — Block C2 Design

**Date:** 2026-06-04
**Phase:** 5 — Owner Dashboard, Block C2
**Branch:** `feature/owner-dashboard`
**Status:** Approved, pending implementation

---

## Context

Phase 5 Block C shipped team ops (add staff, active toggle, branch assignment). Staff rows are created with `user_id = null` — they cannot log in until linked to a `auth.users` record. Block C2 closes this gap by sending an invite email when a staff member is added with an email address, and linking their account on accept.

ADR-035 deferred this to Block C2. The `staff.email` column already exists (migration `0011_staff_contact.sql`).

---

## Approach: Pure metadata + trigger (Approach A)

No new table. Invite metadata (`role`, `business_id`, `staff_id`) is passed as `data` on `auth.admin.inviteUserByEmail`. The updated auth trigger reads this metadata and performs the linking. Pending invite state is derived: `user_id IS NULL AND email IS NOT NULL`.

---

## Section 1: Data model & auth trigger

### What changes

No schema additions. One migration updates the existing trigger.

**Migration `0012_invite_trigger_update.sql`:**

Updates `private.handle_new_user()` to branch on `raw_user_meta_data->>'role'`:

```sql
-- If role = 'staff': insert users row with role='staff' + business_id from metadata,
-- then link staff.user_id = new.id
-- Otherwise: existing owner behavior (role defaults to 'owner')
```

The function remains `SECURITY DEFINER` so it can write to `staff.user_id` without RLS. The `UPDATE staff` happens inside the same trigger function call — atomically within the same transaction as the `auth.users` INSERT.

### Derived state (no extra columns)

| Staff row state | Meaning |
|---|---|
| `user_id IS NOT NULL` | Linked — staff can log in |
| `user_id IS NULL AND email IS NOT NULL` | Pending invite |
| `user_id IS NULL AND email IS NULL` | Unlinked, no invite (manual entry) |

### Edge cases

- **Staff member already has a Klyro account:** `inviteUserByEmail` returns an error. Surface as `ApiError.conflict`.
- **`on conflict (id) do nothing`** on the `users` INSERT: if somehow the `auth.users` row already existed (re-invite), the trigger no-ops and the staff link UPDATE still runs using the existing user id via `new.id`.
- **Metadata absent or malformed:** trigger falls back to `role = 'owner'` behavior (unchanged). This can only happen if `sendStaffInvite` is bypassed — not possible via the UI.

---

## Section 2: Server actions

**File:** `src/lib/actions/team.ts`

### New action — `sendStaffInvite(staffId: string)`

```
1. getOwnerContext()           — verify caller is owner, get businessId
2. Fetch staff row             — verify belongs to business, has email, user_id IS NULL
3. Throw if already linked     — ApiError.conflict('Staff member already has a Klyro account')
4. Throw if no email           — ApiError.validation({ email: 'No email on file' })
5. Build redirectTo            — headers().get('origin') + '/callback'
6. Admin client inviteUserByEmail(email, {
     data: { role: 'staff', business_id: businessId, staff_id: staffId },
     redirectTo
   })
7. If Supabase returns "already exists" error → ApiError.conflict
8. logger.info + return
```

The admin client (`src/lib/supabase/admin.ts`, service-role) is used **only** for the `inviteUserByEmail` call. Ownership verification uses the authed server client (consistent with ADR-036).

### Updated — `addStaffMember`

After inserting the staff row and linking branches, if `parsed.data.email` is present, call `sendStaffInvite(staffId)`. The invite fires silently as part of the same server action. If the invite call fails, log the error but do **not** roll back the staff row — the owner can resend from `EditStaffDialog`.

### Schema addition — `src/lib/schemas/team.ts`

Add `inviteStaffSchema = z.object({ staffId: z.string().uuid() })` for the resend action input validation.

---

## Section 3: UI

### `AddStaffDialog`

Add a small helper note below the email field:

- Key: `team.add.emailInviteHint`
- ES: `"Se enviará una invitación al correo electrónico"`
- EN: `"An invitation will be sent to this email address"`

Visible only when the email field is non-empty. No other change — invite fires in the server action.

### `StaffCard`

Add a "Pending invite" badge when `user_id IS NULL AND email IS NOT NULL`:

- Key: `team.status.pendingInvite`
- ES: `"Invitación pendiente"`
- EN: `"Pending invite"`

Badge style: amber/warning token (distinct from the active/inactive green/gray badges).

### `EditStaffDialog`

Add a "Resend invite" button in the contact section, visible when `user_id IS NULL AND email IS NOT NULL`:

- Button label key: `team.invite.resend`  — ES: `"Reenviar invitación"` / EN: `"Resend invite"`
- Loading key: `team.invite.resending`  — ES: `"Reenviando..."` / EN: `"Resending..."`
- Success toast key: `team.invite.sentSuccess`  — ES: `"Invitación enviada"` / EN: `"Invite sent"`
- Error toast key: `team.invite.sentFailed`  — ES: `"No se pudo enviar la invitación"` / EN: `"Could not send invite"`

Button has a loading state while the server action runs. Shows a sonner toast on success or failure.

### Callback route

No changes. The existing `/[locale]/callback` route handles the code exchange. Staff land on `/dashboard` after clicking their invite link — the same flow as any other login.

### i18n keys summary

All new keys go in both `src/i18n/locales/es.json` and `src/i18n/locales/en.json`:

```
team.status.pendingInvite
team.add.emailInviteHint
team.invite.resend
team.invite.resending
team.invite.sentSuccess
team.invite.sentFailed
```

---

## Section 4: Tests

**`src/lib/actions/__tests__/team.test.ts` (additions — ~7 tests):**

| Test | Expected |
|---|---|
| `sendStaffInvite` — no session | 401 |
| `sendStaffInvite` — non-owner role | 403 |
| `sendStaffInvite` — staff not in business | 403 |
| `sendStaffInvite` — staff has no email | validation error |
| `sendStaffInvite` — staff already linked | 409 conflict |
| `sendStaffInvite` — success | admin invite called with correct metadata |
| `sendStaffInvite` — Supabase "already exists" | 409 conflict |

**`src/components/dashboard/team/__tests__/StaffCard.test.tsx` (additions — ~3 tests):**

| Test | Expected |
|---|---|
| `user_id=null, email=set` | shows pending invite badge |
| `user_id=null, email=null` | no pending badge |
| `user_id=set` | no pending badge |

**`src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` (additions — ~3 tests):**

| Test | Expected |
|---|---|
| `user_id=null, email=set` | resend button visible |
| `user_id=set` | resend button hidden |
| resend click | calls `sendStaffInvite`, shows success toast |

**Total new tests:** ~13 on top of 468 passing.

---

## File inventory

| File | Change |
|---|---|
| `supabase/migrations/0012_invite_trigger_update.sql` | New — update auth trigger |
| `src/lib/actions/team.ts` | Add `sendStaffInvite`, update `addStaffMember` |
| `src/lib/schemas/team.ts` | Add `inviteStaffSchema` |
| `src/components/dashboard/team/StaffCard.tsx` | Add pending invite badge |
| `src/components/dashboard/team/EditStaffDialog.tsx` | Add resend button |
| `src/components/dashboard/team/AddStaffDialog.tsx` | Add email hint text |
| `src/i18n/locales/es.json` | Add `team.status.pendingInvite`, `team.add.emailInviteHint`, `team.invite.*` |
| `src/i18n/locales/en.json` | Same keys in English |
| `src/lib/actions/__tests__/team.test.ts` | ~7 new tests |
| `src/components/dashboard/team/__tests__/StaffCard.test.tsx` | ~3 new tests |
| `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` | ~3 new tests |
| `src/types/database.ts` | Regenerate after migration |

---

## ADR additions

- **ADR-041:** Invite metadata approach — `staff_id` + `business_id` + `role` passed as `data` to `inviteUserByEmail`; trigger branches on `role`; no separate invitations table needed for MVP.
- **ADR-042:** Admin client scoped to invite call only — ownership verified via authed client first (consistent with ADR-036).
- **ADR-043:** `addStaffMember` does not roll back on invite failure — staff row is created, owner can resend. Avoids partial-failure complexity for a non-critical side-effect.
