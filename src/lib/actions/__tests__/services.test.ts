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
const VALID_INPUT = { name: 'Corte', duration_minutes: 45, price: 150, currency: 'HNL' };

describe('addService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws VALIDATION_FAILED when name is empty', async () => {
    await expect(addService({ ...VALID_INPUT, name: '' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('throws VALIDATION_FAILED when duration_minutes is below 5', async () => {
    await expect(addService({ ...VALID_INPUT, duration_minutes: 4 }))
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
