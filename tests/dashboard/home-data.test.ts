import { describe, it, expect } from "vitest";
import {
  deriveHomeData,
  homeFetchWindow,
  type RawAppointmentRow,
} from "@/lib/dashboard/home-data";

// Honduras / Central Standard Time: UTC-6, no DST.
const TZ = "America/Tegucigalpa";
// 2025-06-09T18:00:00Z == 12:00 local on 2025-06-09.
const NOW = new Date("2025-06-09T18:00:00Z");

function row(
  id: string,
  startsAt: string,
  status: string,
  overrides: Partial<RawAppointmentRow> = {}
): RawAppointmentRow {
  return {
    id,
    starts_at: startsAt,
    status,
    clients: { full_name: `Client ${id}` },
    services: { name: `Service ${id}` },
    staff: { display_name: `Staff ${id}` },
    ...overrides,
  };
}

describe("deriveHomeData", () => {
  const rows: RawAppointmentRow[] = [
    row("A", "2025-06-09T20:00:00Z", "confirmed"), // today, future
    row("B", "2025-06-09T15:00:00Z", "completed"), // today, past
    row("C", "2025-06-09T16:00:00Z", "cancelled"), // today, cancelled (excluded)
    row("D", "2025-06-08T15:00:00Z", "noshow"), // yesterday, no-show
    row("E", "2025-06-12T16:00:00Z", "confirmed"), // 3 days out
    row("F", "2025-06-17T16:00:00Z", "confirmed"), // 8 days out (beyond week)
  ];

  it("counts today's appointments excluding cancelled", () => {
    expect(deriveHomeData(rows, NOW, TZ).kpis.today).toBe(2);
  });

  it("counts upcoming this week (now → +7d, pending/confirmed only)", () => {
    // A (today, future) + E (3 days out); F is beyond the 7-day window.
    expect(deriveHomeData(rows, NOW, TZ).kpis.upcomingWeek).toBe(2);
  });

  it("counts completed today", () => {
    expect(deriveHomeData(rows, NOW, TZ).kpis.completedToday).toBe(1);
  });

  it("counts no-shows over the past 7 days", () => {
    expect(deriveHomeData(rows, NOW, TZ).kpis.noShowsWeek).toBe(1);
  });

  it("returns today's appointments sorted chronologically, excluding cancelled", () => {
    const { today } = deriveHomeData(rows, NOW, TZ);
    expect(today.map((a) => a.id)).toEqual(["B", "A"]);
    expect(today[0]?.clientName).toBe("Client B");
    expect(today[0]?.serviceName).toBe("Service B");
    expect(today[0]?.staffName).toBe("Staff B");
  });

  it("normalizes embedded resources returned as arrays", () => {
    const arrayRow = row("Z", "2025-06-09T17:00:00Z", "confirmed", {
      clients: [{ full_name: "Array Client" }],
      services: [{ name: "Array Service" }],
      staff: [{ display_name: "Array Staff" }],
    });
    const { today } = deriveHomeData([arrayRow], NOW, TZ);
    expect(today[0]?.clientName).toBe("Array Client");
    expect(today[0]?.serviceName).toBe("Array Service");
    expect(today[0]?.staffName).toBe("Array Staff");
  });

  it("handles an empty set", () => {
    const { kpis, today } = deriveHomeData([], NOW, TZ);
    expect(kpis).toEqual({ today: 0, upcomingWeek: 0, completedToday: 0, noShowsWeek: 0 });
    expect(today).toEqual([]);
  });
});

describe("homeFetchWindow", () => {
  it("spans the past 7 days through the next 7 days in the business tz", () => {
    const { start, end } = homeFetchWindow(NOW, TZ);
    // 00:00 local on 2025-06-02 and 2025-06-16 → 06:00Z (UTC-6).
    expect(start).toBe("2025-06-02T06:00:00.000Z");
    expect(end).toBe("2025-06-16T06:00:00.000Z");
  });
});
