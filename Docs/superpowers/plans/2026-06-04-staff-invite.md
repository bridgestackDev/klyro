# Staff Email Invite + Accept Linking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an owner adds a staff member with an email, Supabase sends an invite; when the staff member clicks the link their `auth.users` record is linked to the existing `staff` row. Owners can resend the invite from `EditStaffDialog`.

**Architecture:** Pass `{ role: 'staff', business_id, staff_id }` as metadata on `auth.admin.inviteUserByEmail`. The updated auth trigger branches on this metadata to set `role='staff'` and link `staff.user_id` atomically. Pending state derived from `user_id IS NULL AND email IS NOT NULL` — no new table needed.

**Tech Stack:** Supabase Auth Admin API, Next.js Server Actions, next-intl, Vitest/RTL

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/0012_invite_trigger_update.sql` | New — update auth trigger |
| `src/lib/schemas/team.ts` | Add `inviteStaffSchema` + type |
| `src/i18n/locales/es.json` | 6 new keys under `team` |
| `src/i18n/locales/en.json` | Same 6 keys in English |
| `src/lib/actions/team.ts` | New `sendStaffInvite`, updated `addStaffMember` |
| `src/lib/actions/__tests__/team.test.ts` | ~8 new tests |
| `src/app/[locale]/(dashboard)/team/page.tsx` | Add `user_id` to staff query + prop |
| `src/components/dashboard/team/StaffCard.tsx` | Add `userId` prop + pending badge |
| `src/components/dashboard/team/__tests__/StaffCard.test.tsx` | ~3 new tests |
| `src/components/dashboard/team/EditStaffDialog.tsx` | Add `userId` prop + resend button |
| `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` | ~3 new tests |
| `src/components/dashboard/team/AddStaffDialog.tsx` | Email hint text |

---

## Task 1: DB Migration — update auth trigger

**Files:**
- Create: `supabase/migrations/0012_invite_trigger_update.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Replaces private.handle_new_user() to support staff invite acceptance.
-- When inviteUserByEmail is called with data.role='staff', the trigger
-- sets role='staff', business_id, and links staff.user_id atomically.
-- Normal owner sign-ups are unaffected.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role     text;
  v_business uuid := null;
  v_staff    uuid := null;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'owner');

  -- Only parse UUIDs for staff invites (avoids cast errors on normal sign-ups)
  if v_role = 'staff' then
    begin
      v_business := (new.raw_user_meta_data->>'business_id')::uuid;
      v_staff    := (new.raw_user_meta_data->>'staff_id')::uuid;
    exception when invalid_text_representation then
      v_business := null;
      v_staff    := null;
    end;
  end if;

  insert into public.users (id, email, full_name, avatar_url, role, provider, business_id)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    new.raw_app_meta_data->>'provider',
    v_business
  )
  on conflict (id) do nothing;

  -- Link the pre-created staff row to the new auth user
  if v_role = 'staff' and v_staff is not null and v_business is not null then
    update public.staff
    set user_id = new.id
    where id = v_staff
      and business_id = v_business
      and user_id is null;
  end if;

  return new;
end;
$$;
```

- [ ] **Step 2: Apply migration to remote Supabase**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `ouexfehqxpgewzgytjgc`
- `name`: `invite_trigger_update`
- `query`: (the SQL above)

- [ ] **Step 3: Verify migration applied**

Use `mcp__claude_ai_Supabase__list_migrations` with `project_id: ouexfehqxpgewzgytjgc` and confirm `0012_invite_trigger_update` appears.

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/migrations/0012_invite_trigger_update.sql
git commit -m "feat(db): update auth trigger to link staff accounts on invite accept"
```

---

## Task 2: Schema — add `inviteStaffSchema`

**Files:**
- Modify: `src/lib/schemas/team.ts`

- [ ] **Step 1: Add schema and type** — append to the end of `src/lib/schemas/team.ts` before the last line:

The file currently ends with:
```typescript
export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type UpdateStaffContactInput = z.infer<typeof updateStaffContactSchema>;
export type UpdateStaffBranchesInput = z.infer<typeof updateStaffBranchesSchema>;
```

Replace that block with:
```typescript
export type AddStaffInput = z.infer<typeof addStaffSchema>;
export type UpdateStaffContactInput = z.infer<typeof updateStaffContactSchema>;
export type UpdateStaffBranchesInput = z.infer<typeof updateStaffBranchesSchema>;

export const inviteStaffSchema = z.object({
  staffId: z.string().uuid('staffId must be a valid UUID'),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
```

- [ ] **Step 2: Verify no type errors**

```bash
pnpm typecheck 2>&1 | tail -5
```
Expected: `Found 0 errors`

---

## Task 3: i18n — add 6 new keys

**Files:**
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add keys to `es.json`**

In `src/i18n/locales/es.json`, find the `"team"` object. Inside it, add/update these sections:

Under `"status"` (after `"failed": "No se pudo actualizar el estado"`), add:
```json
"pendingInvite": "Invitación pendiente"
```

Under `"add"` (after `"failed": "No se pudo agregar el miembro"`), add:
```json
"emailInviteHint": "Se enviará una invitación al correo electrónico"
```

After the `"add"` section and before the closing `}` of the `"team"` object, add:
```json
"invite": {
  "resend": "Reenviar invitación",
  "resending": "Reenviando…",
  "sentSuccess": "Invitación enviada",
  "sentFailed": "No se pudo enviar la invitación"
}
```

- [ ] **Step 2: Add keys to `en.json`**

Apply the same structure in `src/i18n/locales/en.json`:

Under `"status"`:
```json
"pendingInvite": "Pending invite"
```

Under `"add"`:
```json
"emailInviteHint": "An invitation will be sent to this email address"
```

New `"invite"` section:
```json
"invite": {
  "resend": "Resend invite",
  "resending": "Resending…",
  "sentSuccess": "Invite sent",
  "sentFailed": "Could not send invite"
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./src/i18n/locales/es.json'); require('./src/i18n/locales/en.json'); console.log('OK')"
```
Expected output: `OK`

---

## Task 4: `sendStaffInvite` action — TDD

**Files:**
- Modify: `src/lib/actions/__tests__/team.test.ts` (tests first)
- Modify: `src/lib/actions/team.ts` (implementation)

- [ ] **Step 1: Add mock for admin client + import** in `src/lib/actions/__tests__/team.test.ts`

After the existing `vi.mock('@/lib/supabase/server', ...)` block, add:

```typescript
const mockInviteUserByEmail = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        inviteUserByEmail: (...args: unknown[]) => mockInviteUserByEmail(...args),
      },
    },
  })),
}));
```

Update the import line (currently `import { addStaffMember, setStaffActive, updateStaffBranches } from '../team';`) to:

```typescript
import { addStaffMember, setStaffActive, updateStaffBranches, sendStaffInvite } from '../team';
```

- [ ] **Step 2: Write failing tests** — add after the `updateStaffBranches` describe block in `src/lib/actions/__tests__/team.test.ts`:

```typescript
describe('sendStaffInvite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when the caller is not an owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'staff' }));
    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws FORBIDDEN when the staff member belongs to another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz-other', email: 'x@x.com', user_id: null }));
    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws VALIDATION_FAILED when the staff member has no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: null, user_id: null }));
    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws CONFLICT when the staff member is already linked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: 'ana@klyro.app', user_id: 'existing-user-id' }));
    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('calls inviteUserByEmail with correct metadata on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: 'ana@klyro.app', user_id: null }));
    mockInviteUserByEmail.mockResolvedValue({ data: { user: {} }, error: null });

    await sendStaffInvite(STAFF_ID);

    expect(mockInviteUserByEmail).toHaveBeenCalledWith('ana@klyro.app', {
      data: { role: 'staff', business_id: 'biz1', staff_id: STAFF_ID },
      redirectTo: expect.stringContaining('/callback'),
    });
  });

  it('throws CONFLICT when Supabase returns an "already registered" error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: 'ana@klyro.app', user_id: null }));
    mockInviteUserByEmail.mockResolvedValue({ data: null, error: { message: 'User already registered' } });

    await expect(sendStaffInvite(STAFF_ID)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm test src/lib/actions/__tests__/team.test.ts 2>&1 | tail -20
```
Expected: failures mentioning `sendStaffInvite is not a function` or similar import error.

- [ ] **Step 4: Implement `sendStaffInvite`** — add to `src/lib/actions/team.ts`

First, update the imports at the top of `src/lib/actions/team.ts`. After the existing imports, add:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { inviteStaffSchema } from '@/lib/schemas/team';
```

Update the existing schemas import line. The current import is:
```typescript
import {
  addStaffSchema,
  updateStaffContactSchema,
  updateStaffBranchesSchema,
  type AddStaffInput,
  type UpdateStaffContactInput,
  type UpdateStaffBranchesInput,
} from '@/lib/schemas/team';
```

Replace with:
```typescript
import {
  addStaffSchema,
  updateStaffContactSchema,
  updateStaffBranchesSchema,
  inviteStaffSchema,
  type AddStaffInput,
  type UpdateStaffContactInput,
  type UpdateStaffBranchesInput,
} from '@/lib/schemas/team';
```

Then add the `sendStaffInvite` function at the end of `src/lib/actions/team.ts`:

```typescript
/**
 * Sends a Supabase invite email to a staff member. The auth trigger will link
 * staff.user_id when they accept. Owner-only; idempotent for resend.
 */
export async function sendStaffInvite(staffId: string): Promise<void> {
  const parsed = inviteStaffSchema.safeParse({ staffId });
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, business_id, email, user_id')
    .eq('id', staffId)
    .single();

  if (!staffRow || staffRow.business_id !== businessId) throw ApiError.forbidden();
  if (!staffRow.email) {
    throw ApiError.validation({ email: 'No email on file for this staff member' });
  }
  if (staffRow.user_id) {
    throw ApiError.conflict('Staff member already has a linked account');
  }

  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    staffRow.email as string,
    {
      data: { role: 'staff', business_id: businessId, staff_id: staffId },
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback`,
    }
  );

  if (inviteError) {
    if (inviteError.message.toLowerCase().includes('already')) {
      throw ApiError.conflict('Staff member already has a Klyro account');
    }
    logger.error('sendStaffInvite failed', { userId: user.id, staffId, error: inviteError.message });
    throw ApiError.internal(new Error(inviteError.message));
  }

  logger.info('sendStaffInvite', { userId: user.id, businessId, staffId });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test src/lib/actions/__tests__/team.test.ts 2>&1 | tail -10
```
Expected: all existing tests + 7 new `sendStaffInvite` tests pass.

---

## Task 5: Update `addStaffMember` — auto-invite on email

**Files:**
- Modify: `src/lib/actions/__tests__/team.test.ts` (test first)
- Modify: `src/lib/actions/team.ts` (implementation)

- [ ] **Step 1: Write failing test** — add inside the existing `describe('addStaffMember', ...)` block in `src/lib/actions/__tests__/team.test.ts`, after the existing success test:

```typescript
it('sends an invite when email is provided', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mockFrom
    // addStaffMember: getOwnerContext
    .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
    // addStaffMember: assertBranches
    .mockReturnValueOnce(selectEqIn([{ id: VALID_BRANCH }]))
    // addStaffMember: uniqueStaffSlug (no collision)
    .mockReturnValueOnce(selectEqLike([]))
    // addStaffMember: staff insert
    .mockReturnValueOnce(insertSelectSingle({ data: { id: STAFF_ID }, error: null }))
    // addStaffMember: branch links
    .mockReturnValueOnce(insertResolve(null))
    // sendStaffInvite: getOwnerContext
    .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
    // sendStaffInvite: staff row fetch
    .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: 'ana@klyro.app', user_id: null }));

  mockInviteUserByEmail.mockResolvedValue({ data: { user: {} }, error: null });

  const result = await addStaffMember({
    displayName: 'Ana',
    email: 'ana@klyro.app',
    branchIds: [VALID_BRANCH],
  });

  expect(result).toEqual({ id: STAFF_ID });
  expect(mockInviteUserByEmail).toHaveBeenCalledWith('ana@klyro.app', {
    data: { role: 'staff', business_id: 'biz1', staff_id: STAFF_ID },
    redirectTo: expect.stringContaining('/callback'),
  });
});

it('still returns the staff id when invite fails (non-fatal)', async () => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mockFrom
    .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
    .mockReturnValueOnce(selectEqIn([{ id: VALID_BRANCH }]))
    .mockReturnValueOnce(selectEqLike([]))
    .mockReturnValueOnce(insertSelectSingle({ data: { id: STAFF_ID }, error: null }))
    .mockReturnValueOnce(insertResolve(null))
    .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
    .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1', email: 'ana@klyro.app', user_id: null }));

  mockInviteUserByEmail.mockResolvedValue({ data: null, error: { message: 'SMTP error' } });

  const result = await addStaffMember({
    displayName: 'Ana',
    email: 'ana@klyro.app',
    branchIds: [VALID_BRANCH],
  });

  expect(result).toEqual({ id: STAFF_ID });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/actions/__tests__/team.test.ts 2>&1 | grep -E "FAIL|PASS|×|✓" | tail -15
```
Expected: new tests fail (invite not called yet).

- [ ] **Step 3: Update `addStaffMember`** — in `src/lib/actions/team.ts`, find the end of `addStaffMember` just before `revalidatePath`:

Current ending:
```typescript
  logger.info('addStaffMember', { userId: user.id, businessId, staffId });
  revalidatePath('/', 'layout');
  return { id: staffId };
```

Replace with:
```typescript
  // Fire invite email non-fatally — staff row is created regardless.
  // Owner can resend from EditStaffDialog if this fails.
  if (email) {
    try {
      await sendStaffInvite(staffId);
    } catch (err) {
      logger.error('addStaffMember: invite failed (non-fatal)', {
        userId: user.id,
        staffId,
        error: (err as Error).message,
      });
    }
  }

  logger.info('addStaffMember', { userId: user.id, businessId, staffId });
  revalidatePath('/', 'layout');
  return { id: staffId };
```

- [ ] **Step 4: Run all team tests to verify they pass**

```bash
pnpm test src/lib/actions/__tests__/team.test.ts 2>&1 | tail -10
```
Expected: all tests pass (previously 9, now 11 new total in team.test.ts).

---

## Task 6: `StaffCard` — add `userId` prop + pending badge

**Files:**
- Modify: `src/components/dashboard/team/__tests__/StaffCard.test.tsx` (tests first)
- Modify: `src/components/dashboard/team/StaffCard.tsx`
- Modify: `src/app/[locale]/(dashboard)/team/page.tsx`

- [ ] **Step 1: Write failing tests** — add to `src/components/dashboard/team/__tests__/StaffCard.test.tsx`

Update `baseStaff` to include `userId`:
```typescript
const baseStaff: {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  userId: string | null;
} = {
  id: 'staff-1',
  displayName: 'Ana García',
  slug: 'ana-garcia',
  avatarUrl: null,
  isActive: true,
  email: null,
  phone: null,
  userId: null,
};
```

Add tests at the end of `describe('StaffCard', ...)`:
```typescript
  it('shows pending invite badge when userId is null and email is set', () => {
    renderCard({ ...baseStaff, email: 'ana@example.com', userId: null });
    expect(screen.getByText('team.status.pendingInvite')).toBeInTheDocument();
  });

  it('does not show pending invite badge when userId is null and email is also null', () => {
    renderCard({ ...baseStaff, email: null, userId: null });
    expect(screen.queryByText('team.status.pendingInvite')).toBeNull();
  });

  it('does not show pending invite badge when userId is set', () => {
    renderCard({ ...baseStaff, email: 'ana@example.com', userId: 'some-user-id' });
    expect(screen.queryByText('team.status.pendingInvite')).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/components/dashboard/team/__tests__/StaffCard.test.tsx 2>&1 | tail -10
```
Expected: 3 new tests fail.

- [ ] **Step 3: Update `StaffCard.tsx`**

Replace the `StaffMember` interface with:
```typescript
interface StaffMember {
  id: string;
  displayName: string;
  slug: string;
  avatarUrl: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  userId: string | null;
}
```

Add the pending invite badge inside the header section, after the active/inactive badge span. Find this section:
```typescript
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            staff.isActive
              ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
              : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
          }`}
        >
          {staff.isActive ? t('status.active') : t('status.inactive')}
        </span>
```

Replace with:
```typescript
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              staff.isActive
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {staff.isActive ? t('status.active') : t('status.inactive')}
          </span>
          {!staff.userId && staff.email && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
              {t('status.pendingInvite')}
            </span>
          )}
        </div>
```

Also update the `EditStaffDialog` usage to pass `userId`:
```typescript
        <EditStaffDialog
          staffId={staff.id}
          staffName={staff.displayName}
          businessId={businessId}
          currentAvatarUrl={staff.avatarUrl}
          isActive={staff.isActive}
          email={staff.email}
          phone={staff.phone}
          userId={staff.userId}
          branches={branches}
          assignedBranchIds={assignedBranchIds}
        />
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/dashboard/team/__tests__/StaffCard.test.tsx 2>&1 | tail -10
```
Expected: all tests pass (8 existing + 3 new).

- [ ] **Step 5: Update `team/page.tsx`** — add `user_id` to the staff query

Find:
```typescript
    supabase
      .from('staff')
      .select('id, display_name, slug, avatar_url, is_active, email, phone')
```

Replace with:
```typescript
    supabase
      .from('staff')
      .select('id, display_name, slug, avatar_url, is_active, email, phone, user_id')
```

Then update the `StaffCard` props inside the `staff.map(...)` call. Find:
```typescript
              staff={{
                id: member.id as string,
                displayName: member.display_name as string,
                slug: member.slug as string,
                avatarUrl: (member.avatar_url as string | null) ?? null,
                isActive: (member.is_active as boolean) ?? true,
                email: (member.email as string | null) ?? null,
                phone: (member.phone as string | null) ?? null,
              }}
```

Replace with:
```typescript
              staff={{
                id: member.id as string,
                displayName: member.display_name as string,
                slug: member.slug as string,
                avatarUrl: (member.avatar_url as string | null) ?? null,
                isActive: (member.is_active as boolean) ?? true,
                email: (member.email as string | null) ?? null,
                phone: (member.phone as string | null) ?? null,
                userId: (member.user_id as string | null) ?? null,
              }}
```

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -5
```
Expected: `Found 0 errors`

---

## Task 7: `EditStaffDialog` — add `userId` prop + resend button

**Files:**
- Modify: `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` (tests first)
- Modify: `src/components/dashboard/team/EditStaffDialog.tsx`

- [ ] **Step 1: Write failing tests** — in `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx`

Add `sendStaffInvite` to the team actions mock. Find:
```typescript
vi.mock('@/lib/actions/team', () => ({
  setStaffActive: (...args: unknown[]) => mockSetStaffActive(...args),
  updateStaffBranches: (...args: unknown[]) => mockUpdateStaffBranches(...args),
  updateStaffContact: (...args: unknown[]) => mockUpdateStaffContact(...args),
}));
```

Add mock function and update:
```typescript
const mockSendStaffInvite = vi.fn();
vi.mock('@/lib/actions/team', () => ({
  setStaffActive: (...args: unknown[]) => mockSetStaffActive(...args),
  updateStaffBranches: (...args: unknown[]) => mockUpdateStaffBranches(...args),
  updateStaffContact: (...args: unknown[]) => mockUpdateStaffContact(...args),
  sendStaffInvite: (...args: unknown[]) => mockSendStaffInvite(...args),
}));
```

Add `userId: null` to `defaultProps`:
```typescript
const defaultProps = {
  staffId: 'staff-1',
  staffName: 'Ana García',
  businessId: 'biz-1',
  currentAvatarUrl: null,
  isActive: true,
  email: null,
  phone: null,
  userId: null,
  branches: [
    { id: 'b1', name: 'Centro' },
    { id: 'b2', name: 'Norte' },
  ],
  assignedBranchIds: ['b1'],
};
```

Add tests at the end of `describe('EditStaffDialog', ...)`:
```typescript
  it('shows resend invite button when userId is null and email is set', () => {
    render(<EditStaffDialog {...defaultProps} email="ana@example.com" userId={null} />);
    expect(screen.getByText('team.invite.resend')).toBeInTheDocument();
  });

  it('does not show resend button when userId is set', () => {
    render(<EditStaffDialog {...defaultProps} email="ana@example.com" userId="some-uid" />);
    expect(screen.queryByText('team.invite.resend')).toBeNull();
  });

  it('calls sendStaffInvite and shows success toast on resend click', async () => {
    mockSendStaffInvite.mockResolvedValue(undefined);
    render(<EditStaffDialog {...defaultProps} email="ana@example.com" userId={null} />);
    await userEvent.click(screen.getByText('team.invite.resend'));
    await waitFor(() => {
      expect(mockSendStaffInvite).toHaveBeenCalledWith('staff-1');
      expect(toast.success).toHaveBeenCalledWith('team.invite.sentSuccess');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx 2>&1 | tail -10
```
Expected: 3 new tests fail.

- [ ] **Step 3: Update `EditStaffDialog.tsx`**

Update the import from `@/lib/actions/team`:
```typescript
import { setStaffActive, updateStaffContact, updateStaffBranches, sendStaffInvite } from '@/lib/actions/team';
```

Add `userId` to `EditStaffDialogProps` interface:
```typescript
interface EditStaffDialogProps {
  staffId: string;
  staffName: string;
  businessId: string;
  currentAvatarUrl: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  userId: string | null;
  branches: Branch[];
  assignedBranchIds: string[];
}
```

Add `userId` to the destructured props:
```typescript
export function EditStaffDialog({
  staffId,
  staffName,
  businessId,
  currentAvatarUrl,
  isActive,
  email,
  phone,
  userId,
  branches,
  assignedBranchIds,
}: EditStaffDialogProps) {
```

Add resend state + handler after the existing `const [saving, startSave] = useTransition();` line:
```typescript
  const [resending, startResend] = useTransition();

  function handleResendInvite() {
    startResend(async () => {
      try {
        await sendStaffInvite(staffId);
        toast.success(t('invite.sentSuccess'));
      } catch {
        toast.error(t('invite.sentFailed'));
      }
    });
  }
```

Add the resend button inside the Contact section, after the phone help text and before the closing `</div>` of the contact section. Find:
```typescript
            <p className="text-xs text-[var(--color-text-muted)]">{t('contact.phoneHelp')}</p>
          </div>
        </div>
```

Replace with:
```typescript
            <p className="text-xs text-[var(--color-text-muted)]">{t('contact.phoneHelp')}</p>
          </div>
          {!userId && emailValue && (
            <button
              type="button"
              onClick={handleResendInvite}
              disabled={resending}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-dashed border-amber-500/40 px-3 py-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/5 disabled:opacity-50"
            >
              {resending ? t('invite.resending') : t('invite.resend')}
            </button>
          )}
        </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx 2>&1 | tail -10
```
Expected: all tests pass (existing + 3 new).

---

## Task 8: `AddStaffDialog` — email invite hint

**Files:**
- Modify: `src/components/dashboard/team/AddStaffDialog.tsx`

- [ ] **Step 1: Add hint text below the email field**

In `src/components/dashboard/team/AddStaffDialog.tsx`, find the email field section:
```typescript
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">{t('contact.email')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>
```

Replace with:
```typescript
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">{t('contact.email')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.emailPlaceholder')}
                className="pl-9"
                autoComplete="off"
              />
            </div>
            {email.trim() && (
              <p className="text-xs text-[var(--color-text-muted)]">{t('add.emailInviteHint')}</p>
            )}
          </div>
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -5
```
Expected: `Found 0 errors`

---

## Task 9: Final verification + DECISIONS.md + commit

**Files:**
- Modify: `DECISIONS.md`
- Modify: `STATUS.md`
- Modify: `TASKS.md`

- [ ] **Step 1: Run full test suite**

```bash
pnpm test 2>&1 | tail -15
```
Expected: all tests pass (~481+ total, up from 468).

- [ ] **Step 2: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint 2>&1 | tail -10
```
Expected: `Found 0 errors`, 0 lint warnings.

- [ ] **Step 3: Append ADRs to `DECISIONS.md`**

Append to `DECISIONS.md`:

```markdown
## Phase 5 — Block C2

### ADR-041: Staff invite uses metadata on inviteUserByEmail — no separate invitations table

**Decision:** Staff invite metadata (`role: 'staff'`, `business_id`, `staff_id`) is passed as `data` to `auth.admin.inviteUserByEmail`. The updated `private.handle_new_user` trigger reads this metadata and links `staff.user_id` atomically. Pending invite state is derived from `user_id IS NULL AND email IS NOT NULL` — no new table needed.

**Why:** A dedicated `staff_invitations` table would require a callback route that matches invite tokens — redundant because Supabase handles token verification server-side. The metadata approach is the idiomatic Supabase pattern and keeps the schema minimal.

**Trade-off:** No explicit invite audit log. If beta feedback demands "invited at" timestamps, add `invite_sent_at` column to `staff` in a future migration.

---

### ADR-042: Admin client scoped to inviteUserByEmail call only

**Decision:** `sendStaffInvite` verifies ownership with the authed server client before creating the `createAdminClient()` solely for the `inviteUserByEmail` call. The admin client is not used for any read or write on application tables.

**Why:** Consistent with ADR-036 (owner team actions use authed client). Scoping the admin client to the minimum surface area reduces the blast radius of any auth logic bug — ownership is always validated via RLS-enforced queries first.

---

### ADR-043: addStaffMember does not roll back on invite failure

**Decision:** If `sendStaffInvite` throws after the staff row and branch links have been created, `addStaffMember` catches the error, logs it, and returns the staff id normally. The staff row is persisted regardless.

**Why:** The invite email is a side-effect, not an atomic part of the staff record. Rolling back would leave the owner with no record to resend from. The owner can resend via `EditStaffDialog`; if the row is gone, they'd have to re-add the member entirely — a worse failure mode.
```

- [ ] **Step 4: Update `STATUS.md`** — change Block C2 line from "Not started" to "Done":

Find:
```
**Block C2 (email invite) — Not started. Blocks D–E — Not started.**
```

Replace with:
```
**Block C2 (email invite) — ✅ Done. Blocks D–E — Not started.**
```

- [ ] **Step 5: Update `TASKS.md`** — mark Block C2 tasks complete:

Find:
```markdown
### Block C2 — Staff Email Invite + Accept Linking ⬜
- [ ] Invitations data model (email column or `staff_invitations`), `auth.admin.inviteUserByEmail`, auth-trigger migration to set `role='staff'` + `business_id` and link `staff.user_id` on accept
```

Replace with:
```markdown
### Block C2 — Staff Email Invite + Accept Linking ✅
- [x] `0012_invite_trigger_update.sql` — auth trigger branches on `role='staff'` metadata; links `staff.user_id` atomically on accept
- [x] `sendStaffInvite(staffId)` server action — owner-only, calls `auth.admin.inviteUserByEmail` with `{ role, business_id, staff_id }` metadata
- [x] `addStaffMember` auto-sends invite when email is provided (non-fatal on failure)
- [x] `StaffCard` — pending invite badge when `user_id IS NULL AND email IS NOT NULL`
- [x] `EditStaffDialog` — resend invite button (same condition)
- [x] `AddStaffDialog` — email invite hint text
- [x] i18n: `team.status.pendingInvite`, `team.add.emailInviteHint`, `team.invite.*` (es + en)
- [x] ADR-041, ADR-042, ADR-043
```

- [ ] **Step 6: Commit everything**

```bash
git add \
  supabase/migrations/0012_invite_trigger_update.sql \
  src/lib/schemas/team.ts \
  src/lib/actions/team.ts \
  src/lib/actions/__tests__/team.test.ts \
  src/i18n/locales/es.json \
  src/i18n/locales/en.json \
  src/app/[locale]/\(dashboard\)/team/page.tsx \
  src/components/dashboard/team/StaffCard.tsx \
  src/components/dashboard/team/__tests__/StaffCard.test.tsx \
  src/components/dashboard/team/EditStaffDialog.tsx \
  src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx \
  src/components/dashboard/team/AddStaffDialog.tsx \
  DECISIONS.md STATUS.md TASKS.md
git commit -m "feat(dashboard): Block C2 — staff email invite + accept linking"
```
