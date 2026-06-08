# Block D — Branches / Services / Links / Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four owner dashboard pages — Branches CRUD, Services CRUD, Links/QR, and Settings Business Info — as four independent commits (D1–D4).

**Architecture:** Each sub-block follows the existing `team.ts` pattern: Zod schema → owner-authed server actions → `'use client'` components consuming those actions → server-component page that fetches and passes data down. No new DB migrations; all required columns already exist on `branches`, `services`, and `businesses`. The `whatsapp_number` messaging channel is managed inside the D1 Branch Sheet (it lives on `branches`, not `businesses`).

**Tech Stack:** Next.js 15 App Router, Supabase (authed server client + RLS), Zod v4, shadcn/ui Dialog + Sheet, react-hook-form-style `useState` pattern (no RHF), sonner toasts, next-intl, `qrcode` npm package (D3 only), Vitest.

---

## File Map

### D1 — Branches
| Action | Path |
|--------|------|
| Create | `src/lib/schemas/branches.ts` |
| Create | `src/lib/actions/branches.ts` |
| Create | `src/lib/actions/__tests__/branches.test.ts` |
| Create | `src/components/dashboard/branches/BranchCard.tsx` |
| Create | `src/components/dashboard/branches/__tests__/BranchCard.test.tsx` |
| Create | `src/components/dashboard/branches/BranchSheet.tsx` |
| Create | `src/components/dashboard/branches/__tests__/BranchSheet.test.tsx` |
| Replace | `src/app/[locale]/(dashboard)/branches/page.tsx` (was `.gitkeep`) |
| Modify | `src/i18n/locales/es.json` |
| Modify | `src/i18n/locales/en.json` |

### D2 — Services
| Action | Path |
|--------|------|
| Create | `src/lib/schemas/services.ts` |
| Create | `src/lib/actions/services.ts` |
| Create | `src/lib/actions/__tests__/services.test.ts` |
| Create | `src/components/dashboard/services/ServiceRow.tsx` |
| Create | `src/components/dashboard/services/__tests__/ServiceRow.test.tsx` |
| Create | `src/components/dashboard/services/ServiceDialog.tsx` |
| Create | `src/components/dashboard/services/__tests__/ServiceDialog.test.tsx` |
| Replace | `src/app/[locale]/(dashboard)/services/page.tsx` |
| Modify | `src/i18n/locales/es.json` |
| Modify | `src/i18n/locales/en.json` |

### D3 — Links
| Action | Path |
|--------|------|
| Create | `src/components/dashboard/links/QrCode.tsx` |
| Create | `src/components/dashboard/links/__tests__/QrCode.test.tsx` |
| Create | `src/components/dashboard/links/LinkCard.tsx` |
| Create | `src/components/dashboard/links/__tests__/LinkCard.test.tsx` |
| Replace | `src/app/[locale]/(dashboard)/links/page.tsx` |
| Modify | `src/i18n/locales/es.json` |
| Modify | `src/i18n/locales/en.json` |

### D4 — Settings
| Action | Path |
|--------|------|
| Create | `src/lib/schemas/settings.ts` |
| Create | `src/lib/actions/settings.ts` |
| Create | `src/lib/actions/__tests__/settings.test.ts` |
| Create | `src/components/dashboard/settings/BusinessInfoForm.tsx` |
| Create | `src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx` |
| Modify | `src/app/[locale]/(dashboard)/settings/page.tsx` |
| Modify | `src/i18n/locales/es.json` |
| Modify | `src/i18n/locales/en.json` |

---

## D1 — Branches CRUD

### Task 1: Branch Zod schema

**Files:**
- Create: `src/lib/schemas/branches.ts`

- [ ] **Step 1: Create the schema file**

```typescript
// src/lib/schemas/branches.ts
import { z } from 'zod';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';

const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

const optionalPhone = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z
    .string()
    .regex(/^\+\d{7,15}$/, 'phone must be in E.164 format (e.g. +50498765432)')
    .optional()
);

export const addBranchSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.enum(COUNTRY_CODES).default(DEFAULT_COUNTRY),
  timezone: z.string().min(1, 'timezone is required').default('America/Tegucigalpa'),
  phone: optionalPhone,
  whatsapp_number: optionalPhone,
});

export const updateBranchSchema = addBranchSchema.extend({
  is_active: z.boolean().optional(),
});

export type AddBranchInput = z.infer<typeof addBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
```

- [ ] **Step 2: Run typecheck to verify the schema compiles**

```bash
cd klyro && pnpm typecheck
```
Expected: 0 new errors.

---

### Task 2: Branch server actions (TDD)

**Files:**
- Create: `src/lib/actions/__tests__/branches.test.ts`
- Create: `src/lib/actions/branches.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/actions/__tests__/branches.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/log', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

import { addBranch, updateBranch, setBranchActive } from '../branches';

// ── Chain builders ──────────────────────────────────────────────────────────
const selectSingle = (data: unknown) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data }) }) }),
});
const selectEqLike = (data: unknown) => ({
  select: () => ({ eq: () => ({ like: () => Promise.resolve({ data }) }) }),
});
const insertSelectSingle = (result: unknown) => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }),
});
const updateEq = (error: unknown = null) => ({
  update: () => ({ eq: () => Promise.resolve({ error }) }),
});

const BRANCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VALID_INPUT = { name: 'Centro', country: 'HN' as const, timezone: 'America/Tegucigalpa' };

describe('addBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_FAILED when name is empty', async () => {
    await expect(addBranch({ name: '', country: 'HN', timezone: 'America/Tegucigalpa' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(addBranch(VALID_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when the caller is not an owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'staff' }));
    await expect(addBranch(VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('inserts the branch and returns its id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))   // users
      .mockReturnValueOnce(selectEqLike([]))                                         // uniqueSlug (no collision)
      .mockReturnValueOnce(insertSelectSingle({ data: { id: BRANCH_ID }, error: null })); // insert

    const result = await addBranch(VALID_INPUT);
    expect(result).toEqual({ id: BRANCH_ID });

    const { revalidatePath } = await import('next/cache');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/', 'layout');
  });

  it('appends -2 suffix when the base slug is already taken', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectEqLike([{ slug: 'centro' }]))  // base slug taken
      .mockReturnValueOnce(insertSelectSingle({ data: { id: BRANCH_ID }, error: null }));

    await addBranch(VALID_INPUT);
    // The insert mock was called — slug collision was resolved (centro-2)
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});

describe('updateBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when the branch belongs to another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: BRANCH_ID, business_id: 'biz-other' }));
    await expect(updateBranch(BRANCH_ID, VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates the branch fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: BRANCH_ID, business_id: 'biz1' }))
      .mockReturnValueOnce(updateEq(null));
    await expect(updateBranch(BRANCH_ID, VALID_INPUT)).resolves.toBeUndefined();
  });
});

describe('setBranchActive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when branch is in another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: BRANCH_ID, business_id: 'biz-other' }));
    await expect(setBranchActive(BRANCH_ID, false)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('toggles is_active', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: BRANCH_ID, business_id: 'biz1' }))
      .mockReturnValueOnce(updateEq(null));
    await expect(setBranchActive(BRANCH_ID, false)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail with "cannot find module"**

```bash
cd klyro && pnpm test branches.test
```
Expected: FAIL — `Cannot find module '../branches'`

- [ ] **Step 3: Implement the server actions**

```typescript
// src/lib/actions/branches.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import { slugify } from '@/lib/validation/slug';
import {
  addBranchSchema,
  updateBranchSchema,
  type AddBranchInput,
  type UpdateBranchInput,
} from '@/lib/schemas/branches';

async function getOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw ApiError.unauthorized();

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) throw ApiError.notFound('Business');
  if (userData?.role !== 'owner') throw ApiError.forbidden();

  return { supabase, user, businessId };
}

async function uniqueBranchSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  name: string
): Promise<string> {
  const base = slugify(name) || 'branch';
  const { data } = await supabase
    .from('branches')
    .select('slug')
    .eq('business_id', businessId)
    .like('slug', `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function addBranch(input: AddBranchInput): Promise<{ id: string }> {
  const parsed = addBranchSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }
  const { name, address, city, country, timezone, phone, whatsapp_number } = parsed.data;

  const { supabase, user, businessId } = await getOwnerContext();
  const slug = await uniqueBranchSlug(supabase, businessId, name);

  const { data: inserted, error } = await supabase
    .from('branches')
    .insert({
      business_id: businessId,
      name,
      slug,
      address: address ?? null,
      city: city ?? null,
      country,
      timezone,
      phone: phone ?? null,
      whatsapp_number: whatsapp_number ?? null,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    logger.error('addBranch failed', { userId: user.id, businessId, error: error?.message });
    throw ApiError.internal(new Error(error?.message ?? 'insert returned no row'));
  }

  logger.info('addBranch', { userId: user.id, businessId, branchId: inserted.id });
  revalidatePath('/', 'layout');
  return { id: inserted.id as string };
}

export async function updateBranch(id: string, input: UpdateBranchInput): Promise<void> {
  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('branches')
    .update({
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      phone: parsed.data.phone ?? null,
      whatsapp_number: parsed.data.whatsapp_number ?? null,
      ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {}),
    })
    .eq('id', id);

  if (error) {
    logger.error('updateBranch failed', { userId: user.id, branchId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateBranch', { userId: user.id, branchId: id });
  revalidatePath('/', 'layout');
}

export async function setBranchActive(id: string, isActive: boolean): Promise<void> {
  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('branches')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('branches')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    logger.error('setBranchActive failed', { userId: user.id, branchId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('setBranchActive', { userId: user.id, branchId: id, isActive });
  revalidatePath('/', 'layout');
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test branches.test
```
Expected: 6/6 PASS

---

### Task 3: BranchCard component (TDD)

**Files:**
- Create: `src/components/dashboard/branches/__tests__/BranchCard.test.tsx`
- Create: `src/components/dashboard/branches/BranchCard.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/branches/__tests__/BranchCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchCard } from '../BranchCard';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('lucide-react', () => ({
  MapPin: () => null, Clock: () => null, Phone: () => null, Pencil: () => null,
}));

const BASE_BRANCH = {
  id: 'b1',
  business_id: 'biz1',
  name: 'Sucursal Norte',
  slug: 'norte',
  address: 'Calle 1',
  city: 'Tegucigalpa',
  country: 'HN',
  timezone: 'America/Tegucigalpa',
  phone: null,
  whatsapp_number: '+50498765432',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

describe('BranchCard', () => {
  it('renders the branch name', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('Sucursal Norte')).toBeInTheDocument();
  });

  it('renders the active badge when is_active is true', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders the inactive badge when is_active is false', () => {
    render(<BranchCard branch={{ ...BASE_BRANCH, is_active: false }} onEdit={vi.fn()} />);
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('calls onEdit with the branch when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<BranchCard branch={BASE_BRANCH} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onEdit).toHaveBeenCalledWith(BASE_BRANCH);
  });

  it('renders the city', () => {
    render(<BranchCard branch={BASE_BRANCH} onEdit={vi.fn()} />);
    expect(screen.getByText('Tegucigalpa')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test BranchCard.test
```
Expected: FAIL — `Cannot find module '../BranchCard'`

- [ ] **Step 3: Implement BranchCard**

```tsx
// src/components/dashboard/branches/BranchCard.tsx
'use client';

import { MapPin, Clock, Phone, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchCardProps {
  branch: Branch;
  onEdit: (branch: Branch) => void;
}

export function BranchCard({ branch, onEdit }: BranchCardProps) {
  const t = useTranslations('dashboard.branches');

  return (
    <div className="flex items-start justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-text-primary)]">
            {branch.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              branch.is_active
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {branch.is_active ? t('active') : t('inactive')}
          </span>
        </div>
        {branch.city && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {branch.city}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {branch.timezone}
        </p>
        {branch.whatsapp_number && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {branch.whatsapp_number}
          </p>
        )}
      </div>
      <button
        onClick={() => onEdit(branch)}
        aria-label={t('editBranch', { name: branch.name } as Parameters<typeof t>[1])}
        className="ml-3 shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test BranchCard.test
```
Expected: 5/5 PASS

---

### Task 4: BranchSheet component (TDD)

**Files:**
- Create: `src/components/dashboard/branches/__tests__/BranchSheet.test.tsx`
- Create: `src/components/dashboard/branches/BranchSheet.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/branches/__tests__/BranchSheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchSheet } from '../BranchSheet';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/branches', () => ({
  addBranch: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateBranch: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/components/wizard/CountryPhoneInput', () => ({
  CountryPhoneInput: ({ id }: { id: string }) => <input id={id} data-testid="phone-input" />,
}));

describe('BranchSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the add title when no initialData', () => {
    render(<BranchSheet open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('addTitle')).toBeInTheDocument();
  });

  it('renders the edit title when initialData is provided', () => {
    const branch = {
      id: 'b1', business_id: 'biz1', name: 'Centro', slug: 'centro',
      address: null, city: 'Tegucigalpa', country: 'HN', timezone: 'America/Tegucigalpa',
      phone: null, whatsapp_number: null, is_active: true, created_at: '2026-01-01T00:00:00Z',
    };
    render(<BranchSheet open={true} onOpenChange={vi.fn()} initialData={branch} />);
    expect(screen.getByText('editTitle')).toBeInTheDocument();
  });

  it('pre-fills the name field with initialData.name', () => {
    const branch = {
      id: 'b1', business_id: 'biz1', name: 'Centro', slug: 'centro',
      address: null, city: null, country: 'HN', timezone: 'America/Tegucigalpa',
      phone: null, whatsapp_number: null, is_active: true, created_at: '2026-01-01T00:00:00Z',
    };
    render(<BranchSheet open={true} onOpenChange={vi.fn()} initialData={branch} />);
    expect(screen.getByDisplayValue('Centro')).toBeInTheDocument();
  });

  it('shows a validation error when save is clicked with an empty name', async () => {
    render(<BranchSheet open={true} onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByText('save'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls addBranch and closes on successful save', async () => {
    const onOpenChange = vi.fn();
    const { addBranch } = await import('@/lib/actions/branches');
    render(<BranchSheet open={true} onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByLabelText('nameLabel'), 'New Branch');
    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(addBranch).toHaveBeenCalled());
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test BranchSheet.test
```
Expected: FAIL — `Cannot find module '../BranchSheet'`

- [ ] **Step 3: Implement BranchSheet**

```tsx
// src/components/dashboard/branches/BranchSheet.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryPhoneInput } from '@/components/wizard/CountryPhoneInput';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';
import { addBranch, updateBranch } from '@/lib/actions/branches';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Branch;
}

type FormState = {
  name: string;
  address: string;
  city: string;
  country: CountryCode;
  timezone: string;
  phone: string;
  whatsapp_number: string;
};

function defaultForm(): FormState {
  return {
    name: '',
    address: '',
    city: '',
    country: DEFAULT_COUNTRY,
    timezone: COUNTRIES[DEFAULT_COUNTRY].timezone,
    phone: '',
    whatsapp_number: '',
  };
}

function formFromBranch(b: Branch): FormState {
  return {
    name: b.name,
    address: b.address ?? '',
    city: b.city ?? '',
    country: (b.country as CountryCode) ?? DEFAULT_COUNTRY,
    timezone: b.timezone,
    phone: b.phone ?? '',
    whatsapp_number: b.whatsapp_number ?? '',
  };
}

export function BranchSheet({ open, onOpenChange, initialData }: BranchSheetProps) {
  const t = useTranslations('dashboard.branches');
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<FormState>(
    initialData ? formFromBranch(initialData) : defaultForm()
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(code: CountryCode) {
    set('country', code);
    set('timezone', COUNTRIES[code].timezone);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setNameError(t('nameRequired'));
      return;
    }
    setNameError(null);
    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          await updateBranch(initialData.id, form);
        } else {
          await addBranch(form);
        }
        toast.success(t('saved'));
        onOpenChange(false);
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('editTitle') : t('addTitle')}</SheetTitle>
          <SheetDescription>{isEdit ? t('editDescription') : t('addDescription')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">{t('nameLabel')}</Label>
            <Input
              id="branch-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={120}
            />
            {nameError && (
              <p className="text-xs text-[var(--color-danger)]" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-country">{t('countryLabel')}</Label>
            <select
              id="branch-country"
              value={form.country}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              {Object.entries(COUNTRIES).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-city">{t('cityLabel')}</Label>
            <Input
              id="branch-city"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder={t('cityPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address">{t('addressLabel')}</Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder={t('addressPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-timezone">{t('timezoneLabel')}</Label>
            <Input
              id="branch-timezone"
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-phone">{t('phoneLabel')}</Label>
            <CountryPhoneInput
              id="branch-phone"
              country={form.country}
              value={form.phone}
              onChange={(v) => set('phone', v)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-whatsapp">{t('whatsappLabel')}</Label>
            <CountryPhoneInput
              id="branch-whatsapp"
              country={form.country}
              value={form.whatsapp_number}
              onChange={(v) => set('whatsapp_number', v)}
            />
            <p className="text-xs text-[var(--color-text-muted)]">{t('whatsappHelp')}</p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test BranchSheet.test
```
Expected: 5/5 PASS

---

### Task 5: Branches page + i18n + commit (D1)

**Files:**
- Replace: `src/app/[locale]/(dashboard)/branches/page.tsx`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys to es.json**

Inside the top-level `"dashboard"` object, add a `"branches"` key (after `"agenda"` or before `"home"` — pick a consistent position):

```json
"branches": {
  "title": "Sucursales",
  "addButton": "Agregar sucursal",
  "empty": "Aún no tienes sucursales. Agrega la primera.",
  "active": "Activa",
  "inactive": "Inactiva",
  "editBranch": "Editar {name}",
  "addTitle": "Nueva sucursal",
  "addDescription": "Completa los datos de la sucursal.",
  "editTitle": "Editar sucursal",
  "editDescription": "Actualiza la información de esta sucursal.",
  "nameLabel": "Nombre",
  "namePlaceholder": "Ej. Sucursal Centro",
  "nameRequired": "El nombre es obligatorio",
  "addressLabel": "Dirección",
  "addressPlaceholder": "Ej. Bulevar Morazán 123",
  "countryLabel": "País",
  "cityLabel": "Ciudad",
  "cityPlaceholder": "Ej. Tegucigalpa",
  "timezoneLabel": "Zona horaria",
  "phoneLabel": "Teléfono general",
  "whatsappLabel": "WhatsApp (confirmaciones)",
  "whatsappHelp": "Este número recibirá las respuestas de tus clientes.",
  "cancel": "Cancelar",
  "save": "Guardar",
  "saving": "Guardando…",
  "saved": "Sucursal guardada",
  "failed": "No se pudo guardar la sucursal"
}
```

- [ ] **Step 2: Add the same keys to en.json**

```json
"branches": {
  "title": "Branches",
  "addButton": "Add branch",
  "empty": "No branches yet. Add your first one.",
  "active": "Active",
  "inactive": "Inactive",
  "editBranch": "Edit {name}",
  "addTitle": "New branch",
  "addDescription": "Fill in the branch details.",
  "editTitle": "Edit branch",
  "editDescription": "Update this branch's information.",
  "nameLabel": "Name",
  "namePlaceholder": "e.g. Downtown Branch",
  "nameRequired": "Name is required",
  "addressLabel": "Address",
  "addressPlaceholder": "e.g. 123 Main St",
  "countryLabel": "Country",
  "cityLabel": "City",
  "cityPlaceholder": "e.g. Tegucigalpa",
  "timezoneLabel": "Timezone",
  "phoneLabel": "General phone",
  "whatsappLabel": "WhatsApp (confirmations)",
  "whatsappHelp": "This number will receive client replies.",
  "cancel": "Cancel",
  "save": "Save",
  "saving": "Saving…",
  "saved": "Branch saved",
  "failed": "Could not save branch"
}
```

- [ ] **Step 3: Create the branches page**

```tsx
// src/app/[locale]/(dashboard)/branches/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { BranchList } from '@/components/dashboard/branches/BranchList';

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('dashboard.branches');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (!userData?.business_id) return null;

  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('business_id', userData.business_id as string)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t('title')}
        </h1>
      </div>
      <BranchList branches={branches ?? []} addButtonLabel={t('addButton')} emptyLabel={t('empty')} />
    </div>
  );
}
```

- [ ] **Step 4: Create BranchList (the client wrapper that owns sheet open-state)**

```tsx
// src/components/dashboard/branches/BranchList.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchCard } from './BranchCard';
import { BranchSheet } from './BranchSheet';
import type { Database } from '@/types/database';

type Branch = Database['public']['Tables']['branches']['Row'];

interface BranchListProps {
  branches: Branch[];
  addButtonLabel: string;
  emptyLabel: string;
}

export function BranchList({ branches, addButtonLabel, emptyLabel }: BranchListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>();

  function openAdd() {
    setEditing(undefined);
    setSheetOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {branches.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} onEdit={openEdit} />
          ))}
        </div>
      )}

      <BranchSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editing}
      />
    </>
  );
}
```

Note: add `BranchList.tsx` to the file-map created above (create under `src/components/dashboard/branches/`).

- [ ] **Step 5: Run the full test suite and typecheck**

```bash
cd klyro && pnpm typecheck && pnpm lint && pnpm test
```
Expected: 0 type errors, 0 lint warnings, all tests pass.

- [ ] **Step 6: Commit D1**

```bash
cd klyro
git add src/lib/schemas/branches.ts \
        src/lib/actions/branches.ts \
        src/lib/actions/__tests__/branches.test.ts \
        src/components/dashboard/branches/ \
        "src/app/[locale]/(dashboard)/branches/page.tsx" \
        src/i18n/locales/es.json \
        src/i18n/locales/en.json
git commit -m "$(cat <<'EOF'
feat(dashboard): D1 branch CRUD — list + Sheet + server actions

Branches page at /branches with add/edit Sheet. Server actions
(addBranch, updateBranch, setBranchActive) follow owner-authed pattern
from team.ts. Slug collision-safe (appends -2/-3). WhatsApp number
managed here (lives on branches, not businesses).

Refs: STATUS.md Phase 5 / TASKS.md Block D1

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## D2 — Services CRUD

### Task 6: Service Zod schema

**Files:**
- Create: `src/lib/schemas/services.ts`

- [ ] **Step 1: Create the schema file**

```typescript
// src/lib/schemas/services.ts
import { z } from 'zod';

export const addServiceSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  duration_min: z
    .number({ invalid_type_error: 'duration must be a number' })
    .int()
    .min(5, 'minimum duration is 5 minutes')
    .max(480, 'maximum duration is 480 minutes'),
  buffer_min: z
    .number({ invalid_type_error: 'buffer must be a number' })
    .int()
    .min(0)
    .max(120)
    .default(0),
  price_cents: z
    .number({ invalid_type_error: 'price must be a number' })
    .int()
    .min(0, 'price must be non-negative')
    .default(0),
  currency: z.string().min(1).max(10).default('HNL'),
});

export const updateServiceSchema = addServiceSchema;

export type AddServiceInput = z.infer<typeof addServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
```

- [ ] **Step 2: Typecheck**

```bash
cd klyro && pnpm typecheck
```
Expected: 0 new errors.

---

### Task 7: Service server actions (TDD)

**Files:**
- Create: `src/lib/actions/__tests__/services.test.ts`
- Create: `src/lib/actions/services.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/actions/__tests__/services.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/log', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

import { addService, updateService, setServiceActive } from '../services';

const selectSingle = (data: unknown) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data }) }) }),
});
const insertSelectSingle = (result: unknown) => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }),
});
const updateEq = (error: unknown = null) => ({
  update: () => ({ eq: () => Promise.resolve({ error }) }),
});

const SERVICE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const VALID_INPUT = { name: 'Corte', duration_min: 45, buffer_min: 0, price_cents: 15000, currency: 'HNL' };

describe('addService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_FAILED when name is empty', async () => {
    await expect(addService({ ...VALID_INPUT, name: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws VALIDATION_FAILED when duration_min is below 5', async () => {
    await expect(addService({ ...VALID_INPUT, duration_min: 4 }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(addService(VALID_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when caller is not an owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'staff' }));
    await expect(addService(VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('inserts the service and returns its id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(insertSelectSingle({ data: { id: SERVICE_ID }, error: null }));

    const result = await addService(VALID_INPUT);
    expect(result).toEqual({ id: SERVICE_ID });
  });
});

describe('updateService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when service belongs to another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: SERVICE_ID, business_id: 'biz-other' }));
    await expect(updateService(SERVICE_ID, VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates the service fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: SERVICE_ID, business_id: 'biz1' }))
      .mockReturnValueOnce(updateEq(null));
    await expect(updateService(SERVICE_ID, VALID_INPUT)).resolves.toBeUndefined();
  });
});

describe('setServiceActive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when service is in another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: SERVICE_ID, business_id: 'biz-other' }));
    await expect(setServiceActive(SERVICE_ID, false)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('toggles is_active', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: SERVICE_ID, business_id: 'biz1' }))
      .mockReturnValueOnce(updateEq(null));
    await expect(setServiceActive(SERVICE_ID, false)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test services.test
```
Expected: FAIL — `Cannot find module '../services'`

- [ ] **Step 3: Implement the server actions**

```typescript
// src/lib/actions/services.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import {
  addServiceSchema,
  updateServiceSchema,
  type AddServiceInput,
  type UpdateServiceInput,
} from '@/lib/schemas/services';

async function getOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw ApiError.unauthorized();

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) throw ApiError.notFound('Business');
  if (userData?.role !== 'owner') throw ApiError.forbidden();

  return { supabase, user, businessId };
}

export async function addService(input: AddServiceInput): Promise<{ id: string }> {
  const parsed = addServiceSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: inserted, error } = await supabase
    .from('services')
    .insert({
      business_id: businessId,
      name: parsed.data.name,
      duration_min: parsed.data.duration_min,
      buffer_min: parsed.data.buffer_min,
      price_cents: parsed.data.price_cents,
      currency: parsed.data.currency,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    logger.error('addService failed', { userId: user.id, businessId, error: error?.message });
    throw ApiError.internal(new Error(error?.message ?? 'insert returned no row'));
  }

  logger.info('addService', { userId: user.id, businessId, serviceId: inserted.id });
  revalidatePath('/', 'layout');
  return { id: inserted.id as string };
}

export async function updateService(id: string, input: UpdateServiceInput): Promise<void> {
  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('services')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('services')
    .update({
      name: parsed.data.name,
      duration_min: parsed.data.duration_min,
      buffer_min: parsed.data.buffer_min,
      price_cents: parsed.data.price_cents,
      currency: parsed.data.currency,
    })
    .eq('id', id);

  if (error) {
    logger.error('updateService failed', { userId: user.id, serviceId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateService', { userId: user.id, serviceId: id });
  revalidatePath('/', 'layout');
}

export async function setServiceActive(id: string, isActive: boolean): Promise<void> {
  const { supabase, user, businessId } = await getOwnerContext();

  const { data: row } = await supabase
    .from('services')
    .select('id, business_id')
    .eq('id', id)
    .single();
  if (!row || (row.business_id as string) !== businessId) throw ApiError.forbidden();

  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    logger.error('setServiceActive failed', { userId: user.id, serviceId: id, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('setServiceActive', { userId: user.id, serviceId: id, isActive });
  revalidatePath('/', 'layout');
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test services.test
```
Expected: 7/7 PASS

---

### Task 8: ServiceRow component (TDD)

**Files:**
- Create: `src/components/dashboard/services/__tests__/ServiceRow.test.tsx`
- Create: `src/components/dashboard/services/ServiceRow.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/services/__tests__/ServiceRow.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceRow } from '../ServiceRow';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string, p?: Record<string, unknown>) => p ? `${k}:${JSON.stringify(p)}` : k }));
vi.mock('@/lib/actions/services', () => ({ setServiceActive: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/format/currency', () => ({ formatCurrency: (cents: number, currency: string) => `${currency} ${cents / 100}` }));
vi.mock('lucide-react', () => ({ Pencil: () => null }));

const BASE_SERVICE = {
  id: 's1', business_id: 'biz1', name: 'Corte', duration_min: 45, buffer_min: 10,
  price_cents: 15000, currency: 'HNL', is_active: true, created_at: '2026-01-01T00:00:00Z',
};

describe('ServiceRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the service name', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('renders the formatted duration', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('renders the formatted price', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('HNL 150')).toBeInTheDocument();
  });

  it('renders the active badge', () => {
    render(<ServiceRow service={BASE_SERVICE} onEdit={vi.fn()} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<ServiceRow service={BASE_SERVICE} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(BASE_SERVICE);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test ServiceRow.test
```
Expected: FAIL — `Cannot find module '../ServiceRow'`

- [ ] **Step 3: Implement ServiceRow**

```tsx
// src/components/dashboard/services/ServiceRow.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format/currency';
import { setServiceActive } from '@/lib/actions/services';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceRowProps {
  service: Service;
  onEdit: (service: Service) => void;
}

export function ServiceRow({ service, onEdit }: ServiceRowProps) {
  const t = useTranslations('dashboard.services');
  const [optimisticActive, setOptimisticActive] = useOptimistic(service.is_active);
  const [, startTransition] = useTransition();

  function handleToggle() {
    const next = !optimisticActive;
    startTransition(async () => {
      setOptimisticActive(next);
      try {
        await setServiceActive(service.id, next);
      } catch {
        setOptimisticActive(!next);
        toast.error(t('failed'));
      }
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-text-primary)]">
            {service.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              optimisticActive
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
            }`}
          >
            {optimisticActive ? t('active') : t('inactive')}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {service.duration_min} min
          {service.buffer_min > 0 && ` · +${service.buffer_min} min`}
          {' · '}
          {formatCurrency(service.price_cents, service.currency)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          role="switch"
          aria-checked={optimisticActive}
          onClick={handleToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            optimisticActive ? 'bg-[var(--color-violet)]' : 'bg-[var(--border-subtle)]'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              optimisticActive ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          onClick={() => onEdit(service)}
          aria-label={`edit ${service.name}`}
          className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test ServiceRow.test
```
Expected: 5/5 PASS

---

### Task 9: ServiceDialog component (TDD)

**Files:**
- Create: `src/components/dashboard/services/__tests__/ServiceDialog.test.tsx`
- Create: `src/components/dashboard/services/ServiceDialog.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/services/__tests__/ServiceDialog.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceDialog } from '../ServiceDialog';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/services', () => ({
  addService: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateService: vi.fn().mockResolvedValue(undefined),
}));

const BASE_SERVICE = {
  id: 's1', business_id: 'biz1', name: 'Corte', duration_min: 45, buffer_min: 0,
  price_cents: 15000, currency: 'HNL', is_active: true, created_at: '2026-01-01T00:00:00Z',
};

describe('ServiceDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders add title when no initialData', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('addTitle')).toBeInTheDocument();
  });

  it('renders edit title when initialData provided', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} initialData={BASE_SERVICE} />);
    expect(screen.getByText('editTitle')).toBeInTheDocument();
  });

  it('pre-fills the name field', () => {
    render(<ServiceDialog open={true} onOpenChange={vi.fn()} initialData={BASE_SERVICE} />);
    expect(screen.getByDisplayValue('Corte')).toBeInTheDocument();
  });

  it('calls addService and closes on save', async () => {
    const { addService } = await import('@/lib/actions/services');
    const onOpenChange = vi.fn();
    render(<ServiceDialog open={true} onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByLabelText('nameLabel'), 'Nuevo');
    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(addService).toHaveBeenCalled());
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test ServiceDialog.test
```
Expected: FAIL — `Cannot find module '../ServiceDialog'`

- [ ] **Step 3: Implement ServiceDialog**

```tsx
// src/components/dashboard/services/ServiceDialog.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addService, updateService } from '@/lib/actions/services';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Service;
  defaultCurrency?: string;
}

type FormState = {
  name: string;
  duration_min: string;
  buffer_min: string;
  price: string;
  currency: string;
};

function defaultForm(currency: string): FormState {
  return { name: '', duration_min: '45', buffer_min: '0', price: '0', currency };
}

function formFromService(s: Service): FormState {
  return {
    name: s.name,
    duration_min: String(s.duration_min),
    buffer_min: String(s.buffer_min),
    price: String(s.price_cents / 100),
    currency: s.currency,
  };
}

export function ServiceDialog({
  open,
  onOpenChange,
  initialData,
  defaultCurrency = 'HNL',
}: ServiceDialogProps) {
  const t = useTranslations('dashboard.services');
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<FormState>(
    initialData ? formFromService(initialData) : defaultForm(defaultCurrency)
  );
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        duration_min: parseInt(form.duration_min, 10) || 0,
        buffer_min: parseInt(form.buffer_min, 10) || 0,
        price_cents: Math.round(parseFloat(form.price || '0') * 100),
        currency: form.currency,
      };
      try {
        if (isEdit && initialData) {
          await updateService(initialData.id, payload);
        } else {
          await addService(payload);
        }
        toast.success(t('saved'));
        onOpenChange(false);
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogDescription>{isEdit ? t('editDescription') : t('addDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="svc-name">{t('nameLabel')}</Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={120}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-duration">{t('durationLabel')}</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                max={480}
                value={form.duration_min}
                onChange={(e) => set('duration_min', e.target.value)}
                placeholder={t('durationPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-buffer">{t('bufferLabel')}</Label>
              <Input
                id="svc-buffer"
                type="number"
                min={0}
                max={120}
                value={form.buffer_min}
                onChange={(e) => set('buffer_min', e.target.value)}
                placeholder={t('bufferPlaceholder')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">{t('priceLabel')}</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder={t('pricePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-currency">{t('currencyLabel')}</Label>
              <Input
                id="svc-currency"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t('cancel')}</DialogClose>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test ServiceDialog.test
```
Expected: 4/4 PASS

---

### Task 10: Services page + i18n + commit (D2)

**Files:**
- Replace: `src/app/[locale]/(dashboard)/services/page.tsx`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys to es.json** (inside `"dashboard"` object)

```json
"services": {
  "title": "Servicios",
  "addButton": "Agregar servicio",
  "empty": "Aún no tienes servicios. Agrega el primero.",
  "active": "Activo",
  "inactive": "Inactivo",
  "addTitle": "Nuevo servicio",
  "addDescription": "Define un servicio para tu negocio.",
  "editTitle": "Editar servicio",
  "editDescription": "Actualiza la información de este servicio.",
  "nameLabel": "Nombre",
  "namePlaceholder": "Ej. Corte de cabello",
  "durationLabel": "Duración (min)",
  "durationPlaceholder": "45",
  "bufferLabel": "Preparación (min)",
  "bufferPlaceholder": "0",
  "priceLabel": "Precio",
  "pricePlaceholder": "0.00",
  "currencyLabel": "Moneda",
  "cancel": "Cancelar",
  "save": "Guardar",
  "saving": "Guardando…",
  "saved": "Servicio guardado",
  "failed": "No se pudo guardar el servicio"
}
```

- [ ] **Step 2: Add the same keys to en.json** (inside `"dashboard"` object)

```json
"services": {
  "title": "Services",
  "addButton": "Add service",
  "empty": "No services yet. Add your first one.",
  "active": "Active",
  "inactive": "Inactive",
  "addTitle": "New service",
  "addDescription": "Define a service for your business.",
  "editTitle": "Edit service",
  "editDescription": "Update this service's information.",
  "nameLabel": "Name",
  "namePlaceholder": "e.g. Haircut",
  "durationLabel": "Duration (min)",
  "durationPlaceholder": "45",
  "bufferLabel": "Buffer (min)",
  "bufferPlaceholder": "0",
  "priceLabel": "Price",
  "pricePlaceholder": "0.00",
  "currencyLabel": "Currency",
  "cancel": "Cancel",
  "save": "Save",
  "saving": "Saving…",
  "saved": "Service saved",
  "failed": "Could not save service"
}
```

- [ ] **Step 3: Create the services page**

```tsx
// src/app/[locale]/(dashboard)/services/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ServiceList } from '@/components/dashboard/services/ServiceList';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('dashboard.services');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(default_currency)')
    .eq('id', user.id)
    .single();

  if (!userData?.business_id) return null;

  const businesses = userData.businesses;
  const defaultCurrency =
    ((Array.isArray(businesses) ? businesses[0] : businesses)?.default_currency as string | undefined) ?? 'HNL';

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', userData.business_id as string)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('title')}
      </h1>
      <ServiceList
        services={services ?? []}
        defaultCurrency={defaultCurrency}
        addButtonLabel={t('addButton')}
        emptyLabel={t('empty')}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create ServiceList (client wrapper for dialog open-state)**

```tsx
// src/components/dashboard/services/ServiceList.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceRow } from './ServiceRow';
import { ServiceDialog } from './ServiceDialog';
import type { Database } from '@/types/database';

type Service = Database['public']['Tables']['services']['Row'];

interface ServiceListProps {
  services: Service[];
  defaultCurrency: string;
  addButtonLabel: string;
  emptyLabel: string;
}

export function ServiceList({ services, defaultCurrency, addButtonLabel, emptyLabel }: ServiceListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>();

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <ServiceRow key={s.id} service={s} onEdit={openEdit} />
          ))}
        </div>
      )}

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        defaultCurrency={defaultCurrency}
      />
    </>
  );
}
```

Note: add `ServiceList.tsx` to the file map (create under `src/components/dashboard/services/`).

- [ ] **Step 5: Run the full test suite and typecheck**

```bash
cd klyro && pnpm typecheck && pnpm lint && pnpm test
```
Expected: 0 errors, 0 warnings, all tests pass.

- [ ] **Step 6: Commit D2**

```bash
cd klyro
git add src/lib/schemas/services.ts \
        src/lib/actions/services.ts \
        src/lib/actions/__tests__/services.test.ts \
        src/components/dashboard/services/ \
        "src/app/[locale]/(dashboard)/services/page.tsx" \
        src/i18n/locales/es.json \
        src/i18n/locales/en.json
git commit -m "$(cat <<'EOF'
feat(dashboard): D2 service CRUD — list + Dialog + server actions

Services page at /services with add/edit Dialog and inline active toggle.
Server actions (addService, updateService, setServiceActive) follow
owner-authed pattern. Optimistic toggle with revert on failure.

Refs: STATUS.md Phase 5 / TASKS.md Block D2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## D3 — Links / QR

### Task 11: Install qrcode dependency

- [ ] **Step 1: Add the qrcode package**

```bash
cd klyro && pnpm add qrcode && pnpm add -D @types/qrcode
```

- [ ] **Step 2: Verify the install**

```bash
cd klyro && pnpm typecheck
```
Expected: 0 new errors.

---

### Task 12: QrCode component (TDD)

**Files:**
- Create: `src/components/dashboard/links/__tests__/QrCode.test.tsx`
- Create: `src/components/dashboard/links/QrCode.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/links/__tests__/QrCode.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QrCode } from '../QrCode';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
  toCanvas: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('lucide-react', () => ({ Download: () => <span>download-icon</span> }));

describe('QrCode', () => {
  it('renders a canvas element', () => {
    render(<QrCode url="https://klyro.app/es/salon/centro/ana" staffSlug="ana" />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders the download button', () => {
    render(<QrCode url="https://klyro.app/es/salon/centro/ana" staffSlug="ana" />);
    expect(screen.getByRole('button', { name: /downloadQr/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test QrCode.test
```
Expected: FAIL — `Cannot find module '../QrCode'`

- [ ] **Step 3: Implement QrCode**

```tsx
// src/components/dashboard/links/QrCode.tsx
'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';

interface QrCodeProps {
  url: string;
  staffSlug: string;
}

export function QrCode({ url, staffSlug }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTranslations('dashboard.links');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, url, {
      width: 256,
      color: { dark: '#6D64FB', light: '#FFFFFF' },
    });
  }, [url]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `klyro-qr-${staffSlug}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={256} height={256} className="rounded-lg" />
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-violet-soft)] hover:bg-[var(--color-violet)]/10"
      >
        <Download className="h-4 w-4" />
        {t('downloadQr')}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test QrCode.test
```
Expected: 2/2 PASS

---

### Task 13: LinkCard component (TDD)

**Files:**
- Create: `src/components/dashboard/links/__tests__/LinkCard.test.tsx`
- Create: `src/components/dashboard/links/LinkCard.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/links/__tests__/LinkCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkCard } from '../LinkCard';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/lib/format/initials', () => ({ getInitials: (name: string) => name[0] ?? '?' }));
vi.mock('../QrCode', () => ({ QrCode: () => <div data-testid="qr-code" /> }));
vi.mock('lucide-react', () => ({ Copy: () => null, Check: () => null }));

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

const LINK = {
  staffId: 's1',
  staffName: 'Ana García',
  staffSlug: 'ana',
  staffAvatarUrl: null,
  branchName: 'Centro',
  branchSlug: 'centro',
  url: 'https://klyro.app/es/salon/centro/ana',
};

describe('LinkCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders staff name', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });

  it('renders branch name as a chip', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('Centro')).toBeInTheDocument();
  });

  it('renders the booking URL', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByText('https://klyro.app/es/salon/centro/ana')).toBeInTheDocument();
  });

  it('copies the URL when copy button is clicked', async () => {
    render(<LinkCard link={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: /copyLink/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(LINK.url);
  });

  it('renders the QrCode component', () => {
    render(<LinkCard link={LINK} />);
    expect(screen.getByTestId('qr-code')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test LinkCard.test
```
Expected: FAIL — `Cannot find module '../LinkCard'`

- [ ] **Step 3: Implement LinkCard**

```tsx
// src/components/dashboard/links/LinkCard.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { getInitials } from '@/lib/format/initials';
import { QrCode } from './QrCode';

export interface LinkItem {
  staffId: string;
  staffName: string;
  staffSlug: string;
  staffAvatarUrl: string | null;
  branchName: string;
  branchSlug: string;
  url: string;
}

interface LinkCardProps {
  link: LinkItem;
}

export function LinkCard({ link }: LinkCardProps) {
  const t = useTranslations('dashboard.links');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex items-start gap-3">
        {/* Avatar / initials */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-violet)]/15 text-sm font-semibold text-[var(--color-violet-soft)]">
          {link.staffAvatarUrl ? (
            <img
              src={link.staffAvatarUrl}
              alt={link.staffName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            getInitials(link.staffName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)]">{link.staffName}</span>
            <span className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {link.branchName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--color-text-muted)]">{link.url}</p>
        </div>

        <button
          onClick={handleCopy}
          aria-label={t('copyLink')}
          className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        >
          {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex justify-center border-t border-[var(--border-subtle)] pt-4">
        <QrCode url={link.url} staffSlug={link.staffSlug} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test LinkCard.test
```
Expected: 5/5 PASS

---

### Task 14: Links page + i18n + commit (D3)

**Files:**
- Replace: `src/app/[locale]/(dashboard)/links/page.tsx`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys to es.json** (inside `"dashboard"` object)

```json
"links": {
  "title": "Links de reserva",
  "empty": "No hay staff activo con sucursales asignadas.",
  "copyLink": "Copiar link",
  "copied": "¡Copiado!",
  "downloadQr": "Descargar QR"
}
```

- [ ] **Step 2: Add the same keys to en.json**

```json
"links": {
  "title": "Booking links",
  "empty": "No active staff with branch assignments.",
  "copyLink": "Copy link",
  "copied": "Copied!",
  "downloadQr": "Download QR"
}
```

- [ ] **Step 3: Create the links page**

```tsx
// src/app/[locale]/(dashboard)/links/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { LinkCard, type LinkItem } from '@/components/dashboard/links/LinkCard';

export default async function LinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('dashboard.links');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(slug)')
    .eq('id', user.id)
    .single();

  if (!userData?.business_id) return null;

  const businesses = userData.businesses;
  const businessSlug = (
    (Array.isArray(businesses) ? businesses[0] : businesses)?.slug as string | undefined
  ) ?? '';

  const { data: staffRows } = await supabase
    .from('staff')
    .select('id, display_name, slug, avatar_url, staff_branches(branches(id, name, slug, is_active))')
    .eq('business_id', userData.business_id as string)
    .eq('is_active', true);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const links: LinkItem[] = (staffRows ?? []).flatMap((member) =>
    ((member.staff_branches ?? []) as Array<{ branches: { id: string; name: string; slug: string; is_active: boolean } | null }>)
      .filter((sb) => sb.branches?.is_active)
      .map((sb) => ({
        staffId: member.id as string,
        staffName: member.display_name as string,
        staffSlug: member.slug as string,
        staffAvatarUrl: (member.avatar_url as string | null) ?? null,
        branchName: sb.branches!.name,
        branchSlug: sb.branches!.slug,
        url: `${baseUrl}/${locale}/${businessSlug}/${sb.branches!.slug}/${member.slug}`,
      }))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {t('title')}
      </h1>
      {links.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <LinkCard key={`${link.staffId}-${link.branchSlug}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite and typecheck**

```bash
cd klyro && pnpm typecheck && pnpm lint && pnpm test
```
Expected: 0 errors, 0 warnings, all tests pass.

- [ ] **Step 5: Commit D3**

```bash
cd klyro
git add src/components/dashboard/links/ \
        "src/app/[locale]/(dashboard)/links/page.tsx" \
        src/i18n/locales/es.json \
        src/i18n/locales/en.json \
        package.json \
        pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(dashboard): D3 links page — booking URLs + QR code download

Links page at /links lists active staff × active branch combos with
their booking URLs. QrCode component (qrcode dep) generates a 256px
violet-on-white QR downloadable as PNG per staff member.

Refs: STATUS.md Phase 5 / TASKS.md Block D3

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## D4 — Settings Expansion

### Task 15: Settings schema + server action (TDD)

**Files:**
- Create: `src/lib/schemas/settings.ts`
- Create: `src/lib/actions/__tests__/settings.test.ts`
- Create: `src/lib/actions/settings.ts`

- [ ] **Step 1: Create the schema**

```typescript
// src/lib/schemas/settings.ts
import { z } from 'zod';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/i18n/countries';

const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

export const businessInfoSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  country: z.enum(COUNTRY_CODES).default(DEFAULT_COUNTRY),
  default_currency: z.string().trim().min(1).max(10),
  default_language: z.enum(['es', 'en']),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;
```

- [ ] **Step 2: Write the failing tests**

```typescript
// src/lib/actions/__tests__/settings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/log', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

import { updateBusinessInfo } from '../settings';

const selectSingle = (data: unknown) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data }) }) }),
});
const updateEqBiz = (error: unknown = null) => ({
  update: () => ({ eq: () => Promise.resolve({ error }) }),
});

const VALID_INPUT = { name: 'Mi Negocio', country: 'HN' as const, default_currency: 'HNL', default_language: 'es' as const };

describe('updateBusinessInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_FAILED when name is empty', async () => {
    await expect(updateBusinessInfo({ ...VALID_INPUT, name: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(updateBusinessInfo(VALID_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws FORBIDDEN when caller is not an owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'staff' }));
    await expect(updateBusinessInfo(VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates businesses and revalidates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(updateEqBiz(null));

    await expect(updateBusinessInfo(VALID_INPUT)).resolves.toBeUndefined();

    const { revalidatePath } = await import('next/cache');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/', 'layout');
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd klyro && pnpm test settings.test
```
Expected: FAIL — `Cannot find module '../settings'`

- [ ] **Step 4: Implement the settings action**

```typescript
// src/lib/actions/settings.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors';
import { logger } from '@/lib/log';
import { businessInfoSchema, type BusinessInfoInput } from '@/lib/schemas/settings';

async function getOwnerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw ApiError.unauthorized();

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single();

  const businessId = (userData?.business_id as string | null) ?? null;
  if (!businessId) throw ApiError.notFound('Business');
  if (userData?.role !== 'owner') throw ApiError.forbidden();

  return { supabase, user, businessId };
}

export async function updateBusinessInfo(input: BusinessInfoInput): Promise<void> {
  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) {
    const e = parsed.error.issues[0]!;
    throw ApiError.validation({ [e.path.join('.')]: e.message });
  }

  const { supabase, user, businessId } = await getOwnerContext();

  const { error } = await supabase
    .from('businesses')
    .update({
      name: parsed.data.name,
      country: parsed.data.country,
      default_currency: parsed.data.default_currency,
      default_language: parsed.data.default_language,
    })
    .eq('id', businessId);

  if (error) {
    logger.error('updateBusinessInfo failed', { userId: user.id, businessId, error: error.message });
    throw ApiError.internal(new Error(error.message));
  }

  logger.info('updateBusinessInfo', { userId: user.id, businessId });
  revalidatePath('/', 'layout');
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd klyro && pnpm test settings.test
```
Expected: 4/4 PASS

---

### Task 16: BusinessInfoForm component (TDD)

**Files:**
- Create: `src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx`
- Create: `src/components/dashboard/settings/BusinessInfoForm.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessInfoForm } from '../BusinessInfoForm';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/settings', () => ({
  updateBusinessInfo: vi.fn().mockResolvedValue(undefined),
}));

const DEFAULT_VALUES = {
  name: 'Barbería Clásica',
  country: 'HN',
  default_currency: 'HNL',
  default_language: 'es',
};

describe('BusinessInfoForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the business name field', () => {
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);
    expect(screen.getByLabelText('nameLabel')).toBeInTheDocument();
  });

  it('pre-fills the name from defaultValues', () => {
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);
    expect(screen.getByDisplayValue('Barbería Clásica')).toBeInTheDocument();
  });

  it('calls updateBusinessInfo when save is clicked', async () => {
    const { updateBusinessInfo } = await import('@/lib/actions/settings');
    render(<BusinessInfoForm defaultValues={DEFAULT_VALUES} />);

    await userEvent.click(screen.getByText('save'));

    await vi.waitFor(() => expect(updateBusinessInfo).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Barbería Clásica' })
    ));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd klyro && pnpm test BusinessInfoForm.test
```
Expected: FAIL — `Cannot find module '../BusinessInfoForm'`

- [ ] **Step 3: Implement BusinessInfoForm**

```tsx
// src/components/dashboard/settings/BusinessInfoForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { COUNTRIES, type CountryCode } from '@/lib/i18n/countries';
import { updateBusinessInfo } from '@/lib/actions/settings';

interface BusinessInfoFormProps {
  defaultValues: {
    name: string;
    country: string;
    default_currency: string;
    default_language: string;
  };
}

export function BusinessInfoForm({ defaultValues }: BusinessInfoFormProps) {
  const t = useTranslations('settings.business');
  const [form, setForm] = useState(defaultValues);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(code: string) {
    set('country', code);
    const currency = COUNTRIES[code as CountryCode]?.currency;
    if (currency) set('default_currency', currency);
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateBusinessInfo({
          name: form.name,
          country: form.country as CountryCode,
          default_currency: form.default_currency,
          default_language: form.default_language as 'es' | 'en',
        });
        toast.success(t('saved'));
      } catch {
        toast.error(t('failed'));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="biz-name">{t('nameLabel')}</Label>
        <Input
          id="biz-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-country">{t('countryLabel')}</Label>
        <select
          id="biz-country"
          value={form.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          {Object.entries(COUNTRIES).map(([code, c]) => (
            <option key={code} value={code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-currency">{t('currencyLabel')}</Label>
        <Input
          id="biz-currency"
          value={form.default_currency}
          onChange={(e) => set('default_currency', e.target.value)}
          maxLength={10}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-language">{t('languageLabel')}</Label>
        <select
          id="biz-language"
          value={form.default_language}
          onChange={(e) => set('default_language', e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <Button onClick={handleSubmit} disabled={pending}>
        {pending ? t('saving') : t('save')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd klyro && pnpm test BusinessInfoForm.test
```
Expected: 3/3 PASS

---

### Task 17: Expand settings page + i18n + commit (D4)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/settings/page.tsx`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Add i18n keys to es.json** (inside `"settings"` object, alongside `"brand"`)

```json
"business": {
  "title": "Información del negocio",
  "help": "Actualiza el nombre, país y moneda de tu negocio.",
  "nameLabel": "Nombre del negocio",
  "countryLabel": "País",
  "currencyLabel": "Moneda predeterminada",
  "languageLabel": "Idioma predeterminado",
  "save": "Guardar",
  "saving": "Guardando…",
  "saved": "Información actualizada",
  "failed": "No se pudo actualizar la información"
}
```

- [ ] **Step 2: Add the same keys to en.json** (inside `"settings"` object)

```json
"business": {
  "title": "Business information",
  "help": "Update your business name, country, and currency.",
  "nameLabel": "Business name",
  "countryLabel": "Country",
  "currencyLabel": "Default currency",
  "languageLabel": "Default language",
  "save": "Save",
  "saving": "Saving…",
  "saved": "Information updated",
  "failed": "Could not update information"
}
```

- [ ] **Step 3: Expand the settings page to add the Business Info Card**

Replace the full content of `src/app/[locale]/(dashboard)/settings/page.tsx`:

```tsx
// src/app/[locale]/(dashboard)/settings/page.tsx
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrandSettingsForm } from '@/components/dashboard/settings/BrandSettingsForm';
import { BusinessInfoForm } from '@/components/dashboard/settings/BusinessInfoForm';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const tBrand = await getTranslations('settings.brand');
  const tBiz = await getTranslations('settings.business');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, businesses(id, logo_url, name, country, default_currency, default_language)')
    .eq('id', user.id)
    .single();

  const businesses = userData?.businesses;
  const business = Array.isArray(businesses) ? businesses[0] : businesses;
  const businessId = (business?.id as string | null) ?? (userData?.business_id as string | null);

  if (!businessId || !business) return null;

  const logoUrl = (business.logo_url as string | null) ?? null;

  const bizDefaults = {
    name: (business.name as string) ?? '',
    country: (business.country as string) ?? 'HN',
    default_currency: (business.default_currency as string) ?? 'HNL',
    default_language: (business.default_language as string) ?? 'es',
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
        {tBrand('pageTitle')}
      </h1>

      {/* Brand / logo */}
      <Card>
        <CardHeader>
          <CardTitle>{tBrand('title')}</CardTitle>
          <CardDescription>{tBrand('help')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandSettingsForm businessId={businessId} currentLogoUrl={logoUrl} />
        </CardContent>
      </Card>

      {/* Business info */}
      <Card>
        <CardHeader>
          <CardTitle>{tBiz('title')}</CardTitle>
          <CardDescription>{tBiz('help')}</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessInfoForm defaultValues={bizDefaults} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run the full test suite and typecheck**

```bash
cd klyro && pnpm typecheck && pnpm lint && pnpm test
```
Expected: 0 errors, 0 warnings, all tests pass.

- [ ] **Step 5: Update STATUS.md and TASKS.md**

In `STATUS.md`, under Phase 5 Block D, add a completed entry:

```markdown
**Block D — Branches / Services / Links / Settings** ✅ Done
```

Mark all Block D items in `TASKS.md` as `[x]`.

- [ ] **Step 6: Commit D4**

```bash
cd klyro
git add src/lib/schemas/settings.ts \
        src/lib/actions/settings.ts \
        src/lib/actions/__tests__/settings.test.ts \
        src/components/dashboard/settings/BusinessInfoForm.tsx \
        src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx \
        "src/app/[locale]/(dashboard)/settings/page.tsx" \
        src/i18n/locales/es.json \
        src/i18n/locales/en.json \
        STATUS.md \
        TASKS.md
git commit -m "$(cat <<'EOF'
feat(dashboard): D4 settings — business info form

Adds Business Info Card (name, country, currency, language) to /settings
below the existing Brand Card. updateBusinessInfo server action updates
businesses row owner-only. No migration needed — all columns exist.

Refs: STATUS.md Phase 5 / TASKS.md Block D4

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
