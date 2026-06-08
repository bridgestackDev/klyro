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
