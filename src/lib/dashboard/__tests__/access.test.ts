import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

// redirect() throws in Next so control never falls through — mirror that here.
class RedirectError extends Error {
  constructor(public path: string) {
    super(`REDIRECT:${path}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
}));

import { getDashboardUser, requireOwner } from "../access";

function mockUsersRow(row: { role?: string; business_id?: string | null } | null) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: row }),
      }),
    }),
  });
}

describe("getDashboardUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await getDashboardUser()).toBeNull();
  });

  it("resolves an owner with their business", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUsersRow({ role: "owner", business_id: "biz1" });
    expect(await getDashboardUser()).toEqual({
      userId: "u1",
      role: "owner",
      businessId: "biz1",
    });
  });

  it("resolves a staff member", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    mockUsersRow({ role: "staff", business_id: "biz1" });
    expect(await getDashboardUser()).toEqual({
      userId: "u2",
      role: "staff",
      businessId: "biz1",
    });
  });

  it("defaults an unknown/absent role to staff (least privilege)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u3" } } });
    mockUsersRow(null);
    const me = await getDashboardUser();
    expect(me?.role).toBe("staff");
    expect(me?.businessId).toBeNull();
  });
});

describe("requireOwner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(requireOwner("es")).rejects.toMatchObject({ path: "/es/login" });
  });

  it("redirects staff to the agenda", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    mockUsersRow({ role: "staff", business_id: "biz1" });
    await expect(requireOwner("en")).rejects.toMatchObject({ path: "/en/agenda" });
  });

  it("returns the context for an owner without redirecting", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockUsersRow({ role: "owner", business_id: "biz1" });
    await expect(requireOwner("es")).resolves.toEqual({
      userId: "u1",
      role: "owner",
      businessId: "biz1",
    });
  });
});
