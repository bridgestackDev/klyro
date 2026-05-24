import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Static mocks (declared before imports) ────────────────────────────────────

vi.mock('@/lib/log', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Supabase mock — createClient returns a configurable fake client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { updateBusinessLogo, updateStaffAvatar } from '../media';

// ── Helpers ───────────────────────────────────────────────────────────────────

function singleResult(data: unknown) {
  return { single: vi.fn().mockResolvedValue({ data }) };
}

function eqChain(data: unknown) {
  return { eq: vi.fn().mockReturnValue(singleResult(data)) };
}

function updateChain(error: unknown = null) {
  return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) }) };
}

// ── updateBusinessLogo ────────────────────────────────────────────────────────

describe('updateBusinessLogo', () => {
  const logoUrl = 'https://cdn.example.com/logo.png';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(updateBusinessLogo(logoUrl)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws NOT_FOUND when the user has no business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(eqChain(null)) });
    await expect(updateBusinessLogo(logoUrl)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('succeeds and revalidates when the owner updates the logo', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: 'biz1' })) })
      .mockReturnValueOnce(updateChain(null));

    await expect(updateBusinessLogo(logoUrl)).resolves.toBeUndefined();

    const { revalidatePath } = await import('next/cache');
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/', 'layout');
  });
});

// ── updateStaffAvatar ─────────────────────────────────────────────────────────

describe('updateStaffAvatar', () => {
  const staffId = 'staff1';
  const avatarUrl = 'https://cdn.example.com/avatar.png';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(updateStaffAvatar(staffId, avatarUrl)).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('throws FORBIDDEN when staff belongs to a different business', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      // getSessionAndBusiness → users.select business_id
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: 'biz1' })) })
      // staff ownership check → returns staff from different business
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(eqChain({ id: staffId, user_id: 'other', business_id: 'biz-other' })),
      })
      // role check
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ role: 'owner' })) });

    await expect(updateStaffAvatar(staffId, avatarUrl)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('succeeds when the owner updates a staff avatar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockFrom
      // getSessionAndBusiness → users.select business_id
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: 'biz1' })) })
      // staff ownership check → same business
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(eqChain({ id: staffId, user_id: 'staff-user', business_id: 'biz1' })),
      })
      // role check → owner
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ role: 'owner' })) })
      // staff update
      .mockReturnValueOnce(updateChain(null));

    await expect(updateStaffAvatar(staffId, avatarUrl)).resolves.toBeUndefined();
  });
});
