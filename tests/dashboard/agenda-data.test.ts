import { describe, it, expect } from "vitest";
import {
  localYmd,
  localMinutes,
  addDaysYmd,
  startOfWeekYmd,
  weekDaysYmd,
  appointmentsForDay,
  applyFilters,
  cardLayout,
  normalizeAgendaRows,
  agendaFetchWindow,
  resolveBusinessTimezone,
  type AgendaAppointment,
  type RawAgendaRow,
} from "@/lib/dashboard/agenda-data";

const TZ = "America/Tegucigalpa"; // UTC-6, no DST

describe("local date helpers", () => {
  it("localYmd rolls back across the UTC/local boundary", () => {
    // 03:00Z == 21:00 previous day in UTC-6
    expect(localYmd("2025-06-09T03:00:00Z", TZ)).toBe("2025-06-08");
    expect(localYmd("2025-06-09T18:00:00Z", TZ)).toBe("2025-06-09");
  });

  it("localMinutes returns minutes since local midnight", () => {
    expect(localMinutes("2025-06-09T18:00:00Z", TZ)).toBe(720); // 12:00 local
    expect(localMinutes("2025-06-09T15:00:00Z", TZ)).toBe(540); // 09:00 local
  });

  it("addDaysYmd moves by whole days", () => {
    expect(addDaysYmd("2025-06-09", 1)).toBe("2025-06-10");
    expect(addDaysYmd("2025-06-01", -1)).toBe("2025-05-31");
  });

  it("startOfWeekYmd anchors on Monday", () => {
    expect(startOfWeekYmd("2025-06-11")).toBe("2025-06-09"); // Wed -> Mon
    expect(startOfWeekYmd("2025-06-09")).toBe("2025-06-09"); // Mon -> Mon
    expect(startOfWeekYmd("2025-06-15")).toBe("2025-06-09"); // Sun -> Mon
  });

  it("weekDaysYmd returns Mon..Sun", () => {
    expect(weekDaysYmd("2025-06-11")).toEqual([
      "2025-06-09",
      "2025-06-10",
      "2025-06-11",
      "2025-06-12",
      "2025-06-13",
      "2025-06-14",
      "2025-06-15",
    ]);
  });
});

describe("cardLayout", () => {
  it("positions a card by local start time and duration", () => {
    // 09:00 local, 60 min. DAY_START_HOUR=7, HOUR_PX=56.
    const { top, height } = cardLayout(
      "2025-06-09T15:00:00Z",
      "2025-06-09T16:00:00Z",
      TZ
    );
    expect(top).toBeCloseTo(112, 0); // (540-420) * 56/60
    expect(height).toBeCloseTo(56, 0);
  });

  it("enforces a minimum tappable height for short appointments", () => {
    const { height } = cardLayout(
      "2025-06-09T15:00:00Z",
      "2025-06-09T15:10:00Z",
      TZ
    );
    expect(height).toBe(44);
  });
});

function appt(over: Partial<AgendaAppointment>): AgendaAppointment {
  return {
    id: "a",
    startsAt: "2025-06-09T15:00:00Z",
    endsAt: "2025-06-09T15:30:00Z",
    status: "confirmed",
    bookingCode: null,
    notes: null,
    clientName: "C",
    clientPhone: null,
    clientEmail: null,
    serviceName: "S",
    staffId: "s1",
    staffName: "Staff",
    branchId: "b1",
    branchName: "Branch",
    ...over,
  };
}

describe("filtering", () => {
  const appts = [
    appt({ id: "1", startsAt: "2025-06-09T15:00:00Z", staffId: "s1", branchId: "b1" }),
    appt({ id: "2", startsAt: "2025-06-10T15:00:00Z", staffId: "s2", branchId: "b1" }),
    appt({ id: "3", startsAt: "2025-06-09T16:00:00Z", staffId: "s2", branchId: "b2" }),
  ];

  it("appointmentsForDay keeps only the local day", () => {
    expect(appointmentsForDay(appts, "2025-06-09", TZ).map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("applyFilters narrows by branch and staff", () => {
    expect(applyFilters(appts, "b1", null).map((a) => a.id)).toEqual(["1", "2"]);
    expect(applyFilters(appts, null, "s2").map((a) => a.id)).toEqual(["2", "3"]);
    expect(applyFilters(appts, "b2", "s2").map((a) => a.id)).toEqual(["3"]);
    expect(applyFilters(appts, null, null)).toHaveLength(3);
  });
});

describe("normalizeAgendaRows", () => {
  it("flattens embedded resources whether object or array", () => {
    const rows: RawAgendaRow[] = [
      {
        id: "1",
        starts_at: "2025-06-09T15:00:00Z",
        ends_at: "2025-06-09T15:30:00Z",
        status: "confirmed",
        booking_code: "KLY-ABCD",
        notes: "VIP",
        client: { full_name: "Ana", phone: "+50412345678", email: null },
        service: [{ name: "Corte" }],
        staff: { id: "s1", display_name: "Luis" },
        branch: [{ id: "b1", name: "Centro" }],
      },
    ];
    const a = normalizeAgendaRows(rows)[0]!;
    expect(a).toMatchObject({
      clientName: "Ana",
      clientPhone: "+50412345678",
      serviceName: "Corte",
      staffId: "s1",
      staffName: "Luis",
      branchId: "b1",
      branchName: "Centro",
      bookingCode: "KLY-ABCD",
      notes: "VIP",
    });
  });

  it("tolerates null relations", () => {
    const a = normalizeAgendaRows([
      {
        id: "1",
        starts_at: "2025-06-09T15:00:00Z",
        ends_at: "2025-06-09T15:30:00Z",
        status: "pending",
        booking_code: null,
        notes: null,
        client: null,
        service: null,
        staff: null,
        branch: null,
      },
    ])[0]!;
    expect(a.clientName).toBe("");
    expect(a.staffId).toBe("");
  });
});

describe("agendaFetchWindow", () => {
  it("spans local midnight backDays..forwardDays around today", () => {
    const now = new Date("2025-06-09T18:00:00Z"); // today (local) = 2025-06-09
    const { start, end } = agendaFetchWindow(now, TZ, 7, 35);
    expect(start).toBe("2025-06-02T06:00:00.000Z");
    expect(end).toBe("2025-07-14T06:00:00.000Z");
  });
});

describe("resolveBusinessTimezone", () => {
  it("prefers the first active branch, then any branch, then default", () => {
    expect(
      resolveBusinessTimezone([
        { timezone: "America/Mexico_City", is_active: false },
        { timezone: "America/Tegucigalpa", is_active: true },
      ])
    ).toBe("America/Tegucigalpa");
    expect(resolveBusinessTimezone([])).toBe("America/Tegucigalpa");
  });
});
