import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/log", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom })
  ),
}));

import { updateAppointmentStatus } from "../appointments";

function singleResult(data: unknown) {
  return { single: vi.fn().mockResolvedValue({ data }) };
}
function eqChain(data: unknown) {
  return { eq: vi.fn().mockReturnValue(singleResult(data)) };
}
function updateChain(error: unknown = null) {
  return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error }) }) };
}

describe("updateAppointmentStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an unsupported status before touching the DB", async () => {
    await expect(
      updateAppointmentStatus("appt1", "cancelled" as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("throws UNAUTHORIZED when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(updateAppointmentStatus("appt1", "completed")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws NOT_FOUND when the appointment does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: "biz1" })) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain(null)) });
    await expect(updateAppointmentStatus("appt1", "completed")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN when the appointment belongs to another business", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: "biz1" })) })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(
          eqChain({ id: "appt1", business_id: "biz-other", status: "confirmed" })
        ),
      });
    await expect(updateAppointmentStatus("appt1", "noshow")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("a staff member targeting a colleague's appointment gets NOT_FOUND (RLS hides the row)", async () => {
    // For a staff session, the "staff can view own appointments" SELECT policy
    // returns only their own rows, so a colleague's appointment id resolves to
    // null here — the action throws NOT_FOUND before reaching the UPDATE. The
    // matching "staff can update own appointments" UPDATE policy (0014) would
    // also block the write, but the read scope stops it first.
    mockGetUser.mockResolvedValue({ data: { user: { id: "staff-user" } } });
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: "biz1" })) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain(null)) });
    await expect(updateAppointmentStatus("colleague-appt", "completed")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updates the status for a staff member's own appointment and revalidates", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "staff-user" } } });
    const updateSpy = updateChain(null);
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: "biz1" })) })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(
          eqChain({ id: "my-appt", business_id: "biz1", status: "confirmed" })
        ),
      })
      .mockReturnValueOnce(updateSpy);

    await expect(updateAppointmentStatus("my-appt", "noshow")).resolves.toBeUndefined();
    expect(updateSpy.update).toHaveBeenCalledWith({ status: "noshow" });
  });

  it("updates the status for the owner and revalidates", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const updateSpy = updateChain(null);
    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue(eqChain({ business_id: "biz1" })) })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue(
          eqChain({ id: "appt1", business_id: "biz1", status: "confirmed" })
        ),
      })
      .mockReturnValueOnce(updateSpy);

    await expect(updateAppointmentStatus("appt1", "completed")).resolves.toBeUndefined();
    expect(updateSpy.update).toHaveBeenCalledWith({ status: "completed" });

    const { revalidatePath } = await import("next/cache");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
  });
});
