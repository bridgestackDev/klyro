import { localTimeToUTC } from "@/lib/booking/slots";

/**
 * Appointment status values as constrained by the DB check on `appointments.status`
 * (migration 0001): pending | confirmed | completed | noshow | cancelled.
 */
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "noshow"
  | "cancelled";

/** A single appointment row, joined with its client / service / staff names. */
export interface HomeAppointment {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  clientName: string;
  serviceName: string;
  staffName: string;
}

/** Raw row shape as returned by the Supabase embedded-resource select. */
export interface RawAppointmentRow {
  id: string;
  starts_at: string;
  status: string;
  clients: { full_name: string } | { full_name: string }[] | null;
  services: { name: string } | { name: string }[] | null;
  staff: { display_name: string } | { display_name: string }[] | null;
}

export interface DashboardKpis {
  /** Appointments scheduled today (any non-cancelled status). */
  today: number;
  /** Upcoming appointments from now through the next 7 days (pending/confirmed). */
  upcomingWeek: number;
  /** Appointments marked completed today. */
  completedToday: number;
  /** No-shows over the past 7 days. */
  noShowsWeek: number;
}

export interface HomeData {
  kpis: DashboardKpis;
  today: HomeAppointment[];
}

/** Pick the first element when Supabase returns an embedded to-one as an array. */
function one<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** YYYY-MM-DD for `date` rendered in IANA `tz` (en-CA yields ISO order). */
function ymdInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Add `n` calendar days to a YYYY-MM-DD string (date-only, no tz drift). */
function addDays(ymd: string, n: number): string {
  const parts = ymd.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * The UTC window we need to fetch to derive every KPI: the past 7 days
 * (for no-shows) through the next 7 days (for upcoming), anchored on the
 * start of "today" in the business timezone.
 */
export function homeFetchWindow(now: Date, tz: string): { start: string; end: string } {
  const today = ymdInTz(now, tz);
  return {
    start: localTimeToUTC(addDays(today, -7), "00:00", tz).toISOString(),
    end: localTimeToUTC(addDays(today, 7), "00:00", tz).toISOString(),
  };
}

/**
 * Derive the four KPI counts and today's appointment list from a flat set of
 * appointment rows. Pure — all boundaries are computed in the business
 * timezone so "today" matches what the owner sees on the wall clock.
 */
export function deriveHomeData(
  rows: RawAppointmentRow[],
  now: Date,
  tz: string
): HomeData {
  const today = ymdInTz(now, tz);
  const todayStart = localTimeToUTC(today, "00:00", tz).getTime();
  const todayEnd = localTimeToUTC(addDays(today, 1), "00:00", tz).getTime();
  const weekEnd = localTimeToUTC(addDays(today, 7), "00:00", tz).getTime();
  const weekAgo = localTimeToUTC(addDays(today, -7), "00:00", tz).getTime();
  const nowMs = now.getTime();

  const kpis: DashboardKpis = {
    today: 0,
    upcomingWeek: 0,
    completedToday: 0,
    noShowsWeek: 0,
  };
  const todayList: HomeAppointment[] = [];

  for (const row of rows) {
    const ts = new Date(row.starts_at).getTime();
    const status = row.status as AppointmentStatus;
    const isToday = ts >= todayStart && ts < todayEnd;

    if (isToday && status !== "cancelled") {
      kpis.today += 1;
      todayList.push({
        id: row.id,
        startsAt: row.starts_at,
        status,
        clientName: one(row.clients)?.full_name ?? "",
        serviceName: one(row.services)?.name ?? "",
        staffName: one(row.staff)?.display_name ?? "",
      });
    }

    if (isToday && status === "completed") {
      kpis.completedToday += 1;
    }

    if (
      ts >= nowMs &&
      ts < weekEnd &&
      (status === "pending" || status === "confirmed")
    ) {
      kpis.upcomingWeek += 1;
    }

    if (ts >= weekAgo && ts < todayEnd && status === "noshow") {
      kpis.noShowsWeek += 1;
    }
  }

  todayList.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return { kpis, today: todayList };
}
