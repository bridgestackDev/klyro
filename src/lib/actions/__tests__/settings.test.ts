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
