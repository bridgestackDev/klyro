import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/log", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Supabase admin mock ───────────────────────────────────────────────────────
const mockBranchSingle = vi.fn();
const mockInsert = vi.fn();

const branchChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: mockBranchSingle,
};

const messagesChain = {
  insert: mockInsert,
};

const mockFrom = vi.fn((table: string) => {
  if (table === "branches") return branchChain;
  if (table === "messages") return messagesChain;
  return branchChain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { scheduleMessages } from "@/lib/messaging/schedule";

const APPT_ID = "appt-001";
const BIZ_ID = "biz-001";
const BRANCH_ID = "br-001";

function futureIso(offsetHours: number): string {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString();
}

describe("scheduleMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("inserts 2 rows (confirmation + reminder) for an appointment 25 hours away", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    await scheduleMessages(APPT_ID, futureIso(25), BIZ_ID, BRANCH_ID);

    const rows = mockInsert.mock.calls[0]![0] as Array<Record<string, string>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "confirmation", status: "pending" });
    expect(rows[1]).toMatchObject({ type: "reminder_24h", status: "pending" });
  });

  it("inserts only 1 row (confirmation) for an appointment 23 hours away", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    await scheduleMessages(APPT_ID, futureIso(23), BIZ_ID, BRANCH_ID);

    const rows: unknown[] = mockInsert.mock.calls[0]![0] as Array<Record<string, string>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "confirmation" });
  });

  it("inserts only 1 row for an appointment exactly 24 hours away (boundary)", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    // Exactly 24 hours — should NOT schedule reminder (must be strictly greater)
    await scheduleMessages(APPT_ID, futureIso(24), BIZ_ID, BRANCH_ID);

    const rows: unknown[] = mockInsert.mock.calls[0]![0] as Array<Record<string, string>>;
    expect(rows).toHaveLength(1);
  });

  it("sets channel to whatsapp when branch has whatsapp_number", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    await scheduleMessages(APPT_ID, futureIso(25), BIZ_ID, BRANCH_ID);

    const rows = mockInsert.mock.calls[0]![0] as unknown as Array<{ channel: string }>;
    expect(rows.every((r) => r.channel === "whatsapp")).toBe(true);
  });

  it("falls back to email channel when branch has no whatsapp_number", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: null },
      error: null,
    });

    await scheduleMessages(APPT_ID, futureIso(25), BIZ_ID, BRANCH_ID);

    const rows = mockInsert.mock.calls[0]![0] as unknown as Array<{ channel: string }>;
    expect(rows.every((r) => r.channel === "email")).toBe(true);
  });

  it("sets reminder scheduled_at to approximately 24 hours before starts_at", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    const startsAt = futureIso(48);
    await scheduleMessages(APPT_ID, startsAt, BIZ_ID, BRANCH_ID);

    const rows = mockInsert.mock.calls[0]![0] as unknown as Array<{ type: string; scheduled_at: string }>;
    const reminder = rows.find((r) => r.type === "reminder_24h")!;
    const reminderMs = new Date(reminder.scheduled_at).getTime();
    const startsAtMs = new Date(startsAt).getTime();

    // Should be within 1 second of exactly 24h before starts_at
    expect(Math.abs(reminderMs - (startsAtMs - 24 * 60 * 60 * 1000))).toBeLessThan(1000);
  });

  it("attaches correct appointment_id and business_id to all rows", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });

    await scheduleMessages(APPT_ID, futureIso(25), BIZ_ID, BRANCH_ID);

    const rows = mockInsert.mock.calls[0]![0] as unknown as Array<{ appointment_id: string; business_id: string }>;
    rows.forEach((r) => {
      expect(r.appointment_id).toBe(APPT_ID);
      expect(r.business_id).toBe(BIZ_ID);
    });
  });

  it("throws when supabase insert fails", async () => {
    mockBranchSingle.mockResolvedValue({
      data: { whatsapp_number: "+50422334455" },
      error: null,
    });
    mockInsert.mockResolvedValue({
      error: { message: "DB constraint violation", code: "23503" },
    });

    await expect(
      scheduleMessages(APPT_ID, futureIso(25), BIZ_ID, BRANCH_ID),
    ).rejects.toMatchObject({ message: "DB constraint violation" });
  });
});
