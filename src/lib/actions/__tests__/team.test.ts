import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Static mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/log', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { addStaffMember, setStaffActive, updateStaffBranches } from '../team';

// ── Chain builders (match the exact query shape each action uses) ──────────────

const selectSingle = (data: unknown) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data }) }) }),
});
const selectEqIn = (data: unknown) => ({
  select: () => ({ eq: () => ({ in: () => Promise.resolve({ data }) }) }),
});
const selectEqLike = (data: unknown) => ({
  select: () => ({ eq: () => ({ like: () => Promise.resolve({ data }) }) }),
});
const insertSelectSingle = (result: unknown) => ({
  insert: () => ({ select: () => ({ single: () => Promise.resolve(result) }) }),
});
const insertResolve = (error: unknown = null) => ({
  insert: () => Promise.resolve({ error }),
});
const updateEq = (error: unknown = null) => ({
  update: () => ({ eq: () => Promise.resolve({ error }) }),
});
const deleteEq = (error: unknown = null) => ({
  delete: () => ({ eq: () => Promise.resolve({ error }) }),
});

const VALID_BRANCH = '11111111-1111-4111-8111-111111111111';
const STAFF_ID = '22222222-2222-4222-8222-222222222222';

describe('addStaffMember', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_FAILED when the name is too short', async () => {
    await expect(addStaffMember({ displayName: 'A', branchIds: [] })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(addStaffMember({ displayName: 'Ana', branchIds: [] })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('throws FORBIDDEN when the caller is not an owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'staff' }));
    await expect(addStaffMember({ displayName: 'Ana', branchIds: [] })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws FORBIDDEN when a branch is outside the business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectEqIn([])); // none of the branchIds are owned
    await expect(
      addStaffMember({ displayName: 'Ana', branchIds: [VALID_BRANCH] })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates the staff row + branch links and returns the id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' })) // users
      .mockReturnValueOnce(selectEqIn([{ id: VALID_BRANCH }])) // branches owned
      .mockReturnValueOnce(selectEqLike([{ slug: 'ana' }])) // existing slugs (collision)
      .mockReturnValueOnce(insertSelectSingle({ data: { id: STAFF_ID }, error: null })) // staff insert
      .mockReturnValueOnce(insertResolve(null)); // staff_branches insert

    const result = await addStaffMember({ displayName: 'Ana', branchIds: [VALID_BRANCH] });
    expect(result).toEqual({ id: STAFF_ID });

    const { revalidatePath } = await import('next/cache');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/', 'layout');
  });
});

describe('setStaffActive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws FORBIDDEN when the staff member is in another business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz-other' }));
    await expect(setStaffActive(STAFF_ID, false)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('updates is_active for an owned staff member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' }))
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1' }))
      .mockReturnValueOnce(updateEq(null));
    await expect(setStaffActive(STAFF_ID, false)).resolves.toBeUndefined();
  });
});

describe('updateStaffBranches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces the staff member branch set (delete + insert)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce(selectSingle({ business_id: 'biz1', role: 'owner' })) // users
      .mockReturnValueOnce(selectSingle({ id: STAFF_ID, business_id: 'biz1' })) // staff ownership
      .mockReturnValueOnce(selectEqIn([{ id: VALID_BRANCH }])) // branches owned
      .mockReturnValueOnce(deleteEq(null)) // delete existing
      .mockReturnValueOnce(insertResolve(null)); // insert new
    await expect(
      updateStaffBranches({ staffId: STAFF_ID, branchIds: [VALID_BRANCH] })
    ).resolves.toBeUndefined();
  });

  it('throws VALIDATION_FAILED for a non-uuid staff id', async () => {
    await expect(
      updateStaffBranches({ staffId: 'not-a-uuid', branchIds: [] })
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
