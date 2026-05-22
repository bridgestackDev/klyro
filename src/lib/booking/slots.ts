import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";
import { VERTICALS, type VerticalKey } from "@/lib/verticals/registry";

export type Slot = { startsAt: string; endsAt: string };

export type SlotInputs = {
  staffId: string;
  serviceId: string;
  branchId: string;
  date: string; // YYYY-MM-DD in the business timezone
  now?: Date;   // injectable for tests; defaults to new Date()
};

// ---------------------------------------------------------------------------
// Timezone helpers (no date-fns-tz needed — Node 22 Intl handles all IANA zones)
// ---------------------------------------------------------------------------

/**
 * Convert a wall-clock date+time in `tz` to a UTC Date.
 * Iterates twice so DST boundary edge cases converge correctly.
 */
export function localTimeToUTC(
  dateStr: string,
  timeStr: string,
  tz: string
): Date {
  const hm = timeStr.slice(0, 5); // "HH:MM"
  const dp = dateStr.split("-");
  const tp = hm.split(":");
  const ty = Number(dp[0]);
  const tmo = Number(dp[1]);
  const td = Number(dp[2]);
  const th = Number(tp[0]);
  const tm = Number(tp[1]);
  const targetLocalMs = Date.UTC(ty, tmo - 1, td, th, tm, 0);

  // Start with a rough guess (treat local time as UTC — off by the TZ offset)
  let result = new Date(targetLocalMs);

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(result);
    const get = (type: string) => {
      const v = parts.find((p) => p.type === type)?.value ?? "0";
      const n = parseInt(v, 10);
      // Some Intl implementations return "24" for midnight with hour12:false
      return isNaN(n) ? 0 : n === 24 ? 0 : n;
    };

    const localAsMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    );

    result = new Date(result.getTime() + (targetLocalMs - localAsMs));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Pure slot computation — exported so tests don't need Supabase mocks
// ---------------------------------------------------------------------------

type Availability = { start_time: string; end_time: string };
type Appointment = { starts_at: string; ends_at: string };

export type ComputeSlotsParams = {
  availability: Availability | null;
  appointments: Appointment[];
  durationMinutes: number;
  bufferMinutes: number;
  date: string;
  timezone: string;
  now: Date;
};

export function computeSlots(params: ComputeSlotsParams): Slot[] {
  const {
    availability,
    appointments,
    durationMinutes,
    bufferMinutes,
    date,
    timezone,
    now,
  } = params;

  if (!availability) return [];
  if (durationMinutes <= 0) return [];

  const windowStart = localTimeToUTC(date, availability.start_time, timezone);
  const windowEnd = localTimeToUTC(date, availability.end_time, timezone);

  if (windowStart >= windowEnd) return [];

  const durationMs = durationMinutes * 60_000;
  const stepMs = (durationMinutes + bufferMinutes) * 60_000;

  const slots: Slot[] = [];
  let cursor = windowStart;

  while (true) {
    const slotEnd = new Date(cursor.getTime() + durationMs);
    // Stop when the slot would run past the availability window
    if (slotEnd > windowEnd) break;

    if (cursor >= now) {
      const overlaps = appointments.some((appt) => {
        const aStart = new Date(appt.starts_at);
        const aEnd = new Date(appt.ends_at);
        // Overlap: the slot and the appointment share any time
        return cursor < aEnd && slotEnd > aStart;
      });

      if (!overlaps) {
        slots.push({
          startsAt: cursor.toISOString(),
          endsAt: slotEnd.toISOString(),
        });
      }
    }

    cursor = new Date(cursor.getTime() + stepMs);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Main exported function — loads data then delegates to computeSlots
// ---------------------------------------------------------------------------

function getAnonClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getAvailableSlots(inputs: SlotInputs): Promise<Slot[]> {
  const { staffId, serviceId, branchId, date, now = new Date() } = inputs;
  const supabase = getAnonClient();

  // Day of week derived from the date string (treated as UTC midday to avoid
  // server-TZ shift at date boundaries).
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();

  // 1. Staff availability for the requested day
  const { data: availability } = await supabase
    .from("staff_availability")
    .select("start_time, end_time")
    .eq("staff_id", staffId)
    .eq("branch_id", branchId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (!availability) return [];

  // 2. Service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  if (!service) return [];

  // 3. Branch timezone + business vertical → buffer minutes
  const { data: branch } = await supabase
    .from("branches")
    .select("business_id, timezone")
    .eq("id", branchId)
    .single();

  if (!branch) return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("vertical")
    .eq("id", branch.business_id)
    .single();

  const vertical = (business?.vertical ?? "other") as VerticalKey;
  const bufferMinutes =
    (VERTICALS[vertical] ?? VERTICALS.other).defaultBufferMinutes;
  const timezone = branch.timezone;

  // 4. Existing appointments for this staff member on this day (UTC range)
  const dayStartUTC = localTimeToUTC(date, "00:00", timezone);
  const ndp = date.split("-");
  const y = Number(ndp[0]);
  const mo = Number(ndp[1]);
  const d = Number(ndp[2]);
  const nextDateStr = new Date(Date.UTC(y, mo - 1, d + 1))
    .toISOString()
    .slice(0, 10);
  const dayEndUTC = localTimeToUTC(nextDateStr, "00:00", timezone);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("staff_id", staffId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", dayStartUTC.toISOString())
    .lt("starts_at", dayEndUTC.toISOString());

  return computeSlots({
    availability,
    appointments: appointments ?? [],
    durationMinutes: service.duration_minutes,
    bufferMinutes,
    date,
    timezone,
    now,
  });
}
