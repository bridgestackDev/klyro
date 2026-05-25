import { describe, it, expect } from "vitest";
import { computeSlots, localTimeToUTC } from "@/lib/booking/slots";

// Honduras / Central Standard Time: UTC-6, no DST observed.
const TZ = "America/Tegucigalpa";
// A Monday — day_of_week=1
const DATE = "2025-06-09";

// Barbershop defaults
const DURATION = 30;
const BUFFER = 5;
const STEP = DURATION + BUFFER; // 35 min per slot

const AVAIL = { start_time: "09:00:00", end_time: "18:00:00" };

// UTC equivalents for TZ = UTC-6:
//   09:00 CST = 15:00 UTC  →  "2025-06-09T15:00:00.000Z"
//   18:00 CST = 00:00 UTC next day  →  "2025-06-10T00:00:00.000Z"
//   10:00 CST = 16:00 UTC,  10:30 CST = 16:30 UTC
//   11:00 CST = 17:00 UTC

describe("localTimeToUTC", () => {
  it("converts 09:00 CST to 15:00 UTC", () => {
    const result = localTimeToUTC(DATE, "09:00", TZ);
    expect(result.toISOString()).toBe("2025-06-09T15:00:00.000Z");
  });

  it("converts 18:00 CST to 00:00 UTC next day", () => {
    const result = localTimeToUTC(DATE, "18:00", TZ);
    expect(result.toISOString()).toBe("2025-06-10T00:00:00.000Z");
  });
});

describe("computeSlots", () => {
  // --- B3 test 1: Happy path ---
  it("HN barbershop 09-18 window, 30-min service, 0 appointments → 15 slots", () => {
    // now set to UTC midnight so no past-slot filtering applies
    const now = new Date("2025-06-09T00:00:00.000Z");

    const slots = computeSlots({
      availability: AVAIL,
      appointments: [],
      durationMinutes: DURATION,
      bufferMinutes: BUFFER,
      date: DATE,
      timezone: TZ,
      now,
    });

    // Window 09:00-18:00 = 540 min; step=35 min → floor((540-30)/35)+1 = 15 slots
    expect(slots).toHaveLength(15);

    // First slot: 09:00 local = 15:00 UTC, ends 09:30 local = 15:30 UTC
    expect(slots[0]!.startsAt).toBe("2025-06-09T15:00:00.000Z");
    expect(slots[0]!.endsAt).toBe("2025-06-09T15:30:00.000Z");

    // Last slot: 17:10 local = 23:10 UTC, ends 17:40 = 23:40 UTC
    expect(slots[14]!.startsAt).toBe("2025-06-09T23:10:00.000Z");
    expect(slots[14]!.endsAt).toBe("2025-06-09T23:40:00.000Z");

    // All slots are exactly STEP minutes apart
    for (let i = 1; i < slots.length; i++) {
      const prev = new Date(slots[i - 1]!.startsAt).getTime();
      const curr = new Date(slots[i]!.startsAt).getTime();
      expect(curr - prev).toBe(STEP * 60_000);
    }
  });

  // --- B3 test 2: existing appointment at 10:00 ---
  it("appointment 10:00-10:30 local excludes overlapping slots 09:35 and 10:10", () => {
    // 10:00 CST = 16:00 UTC, 10:30 CST = 16:30 UTC
    const now = new Date("2025-06-09T00:00:00.000Z");

    const slots = computeSlots({
      availability: AVAIL,
      appointments: [
        {
          starts_at: "2025-06-09T16:00:00.000Z",
          ends_at: "2025-06-09T16:30:00.000Z",
        },
      ],
      durationMinutes: DURATION,
      bufferMinutes: BUFFER,
      date: DATE,
      timezone: TZ,
      now,
    });

    // 09:35-10:05 overlaps 10:00-10:30 → excluded
    // 10:10-10:40 overlaps 10:00-10:30 → excluded
    // 15 - 2 = 13 slots
    expect(slots).toHaveLength(13);

    const startTimes = slots.map((s) => s.startsAt);

    // 09:35 local = 15:35 UTC — must be absent
    expect(startTimes).not.toContain("2025-06-09T15:35:00.000Z");
    // 10:10 local = 16:10 UTC — must be absent
    expect(startTimes).not.toContain("2025-06-09T16:10:00.000Z");

    // 09:00 and 10:45 are unaffected
    expect(startTimes).toContain("2025-06-09T15:00:00.000Z");
    expect(startTimes).toContain("2025-06-09T16:45:00.000Z");
  });

  // --- B3 test 3: same-day request with now = 11:00 local ---
  it("now=11:00 local (17:00 UTC) filters all morning slots", () => {
    // 11:00 CST = 17:00 UTC
    const now = new Date("2025-06-09T17:00:00.000Z");

    const slots = computeSlots({
      availability: AVAIL,
      appointments: [],
      durationMinutes: DURATION,
      bufferMinutes: BUFFER,
      date: DATE,
      timezone: TZ,
      now,
    });

    // Past (start < 17:00 UTC): 15:00, 15:35, 16:10, 16:45 → 4 filtered
    // Remaining: 17:20, …, 23:10 → 11 slots
    expect(slots).toHaveLength(11);

    // First slot after 11:00 local: 11:20 CST = 17:20 UTC
    expect(slots[0]!.startsAt).toBe("2025-06-09T17:20:00.000Z");
  });

  // --- B3 test 4: service duration > availability window → no slots ---
  it("90-min service in a 60-min window returns no slots", () => {
    const now = new Date("2025-06-09T00:00:00.000Z");

    const slots = computeSlots({
      availability: { start_time: "09:00:00", end_time: "10:00:00" },
      appointments: [],
      durationMinutes: 90,
      bufferMinutes: 0,
      date: DATE,
      timezone: TZ,
      now,
    });

    expect(slots).toHaveLength(0);
  });

  // --- Edge cases (B2) ---
  it("null availability → no slots", () => {
    const now = new Date("2025-06-09T00:00:00.000Z");
    expect(
      computeSlots({
        availability: null,
        appointments: [],
        durationMinutes: DURATION,
        bufferMinutes: BUFFER,
        date: DATE,
        timezone: TZ,
        now,
      })
    ).toHaveLength(0);
  });

  it("appointment covering entire window → no slots", () => {
    const now = new Date("2025-06-09T00:00:00.000Z");

    const slots = computeSlots({
      availability: AVAIL,
      appointments: [
        {
          starts_at: "2025-06-09T14:00:00.000Z", // 08:00 local — before window
          ends_at: "2025-06-10T01:00:00.000Z",   // 19:00 local — after window
        },
      ],
      durationMinutes: DURATION,
      bufferMinutes: BUFFER,
      date: DATE,
      timezone: TZ,
      now,
    });

    expect(slots).toHaveLength(0);
  });

  it("buffer pushes the last candidate past end_time → last slot excluded", () => {
    // Window 09:00-09:35 (35 min). Duration=30, buffer=10 → step=40.
    // Only one slot fits (09:00-09:30 ≤ 09:35). Next would start at 09:40 which
    // ends at 10:10, past the window — excluded.
    const now = new Date("2025-06-09T00:00:00.000Z");

    const slots = computeSlots({
      availability: { start_time: "09:00:00", end_time: "09:35:00" },
      appointments: [],
      durationMinutes: 30,
      bufferMinutes: 10,
      date: DATE,
      timezone: TZ,
      now,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]!.startsAt).toBe("2025-06-09T15:00:00.000Z");
  });
});
