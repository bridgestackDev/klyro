import { localTimeToUTC } from "@/lib/booking/slots";
import type { AppointmentStatus } from "@/lib/dashboard/home-data";

export const DEFAULT_TZ = "America/Tegucigalpa";

/** Calendar render window (local wall-clock hours). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
/** Pixels per hour in the timeline. */
export const HOUR_PX = 56;
/** Minimum card height so very short appointments stay tappable (≥44px target). */
const MIN_CARD_PX = 44;

export interface AgendaAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  bookingCode: string | null;
  notes: string | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  serviceName: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
}

export interface RawAgendaRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  booking_code: string | null;
  notes: string | null;
  client: { full_name: string; phone: string | null; email: string | null } | { full_name: string; phone: string | null; email: string | null }[] | null;
  service: { name: string } | { name: string }[] | null;
  staff: { id: string; display_name: string } | { id: string; display_name: string }[] | null;
  branch: { id: string; name: string } | { id: string; name: string }[] | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function normalizeAgendaRows(rows: RawAgendaRow[]): AgendaAppointment[] {
  return rows.map((r) => {
    const client = one(r.client);
    const service = one(r.service);
    const staff = one(r.staff);
    const branch = one(r.branch);
    return {
      id: r.id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      status: r.status as AppointmentStatus,
      bookingCode: r.booking_code,
      notes: r.notes,
      clientName: client?.full_name ?? "",
      clientPhone: client?.phone ?? null,
      clientEmail: client?.email ?? null,
      serviceName: service?.name ?? "",
      staffId: staff?.id ?? "",
      staffName: staff?.display_name ?? "",
      branchId: branch?.id ?? "",
      branchName: branch?.name ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Pure date helpers — local (business-timezone) wall-clock math.
// ---------------------------------------------------------------------------

function localParts(iso: string, tz: string): { ymd: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  let hour = parseInt(get("hour"), 10);
  if (hour === 24) hour = 0; // some Intl impls return 24 for midnight
  const minute = parseInt(get("minute"), 10);
  return { ymd: `${y}-${m}-${d}`, minutes: hour * 60 + minute };
}

/** Local YYYY-MM-DD for an ISO timestamp rendered in `tz`. */
export function localYmd(iso: string, tz: string): string {
  return localParts(iso, tz).ymd;
}

/** Minutes since local midnight for an ISO timestamp in `tz`. */
export function localMinutes(iso: string, tz: string): number {
  return localParts(iso, tz).minutes;
}

/** Add `n` calendar days to a YYYY-MM-DD string. */
export function addDaysYmd(ymd: string, n: number): string {
  const p = ymd.split("-");
  const dt = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** Monday-anchored start of the week containing `ymd`. */
export function startOfWeekYmd(ymd: string): string {
  const p = ymd.split("-");
  const day = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))).getUTCDay(); // 0=Sun..6=Sat
  const offset = (day + 6) % 7; // days since Monday
  return addDaysYmd(ymd, -offset);
}

/** The 7 day strings of the week containing `ymd` (Mon..Sun). */
export function weekDaysYmd(ymd: string): string[] {
  const start = startOfWeekYmd(ymd);
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i));
}

/** Today's YYYY-MM-DD in the business timezone. */
export function todayYmd(now: Date, tz: string): string {
  return localYmd(now.toISOString(), tz);
}

/** Appointments that start on `dayYmd` (business-timezone day). */
export function appointmentsForDay(
  appts: AgendaAppointment[],
  dayYmd: string,
  tz: string
): AgendaAppointment[] {
  return appts.filter((a) => localYmd(a.startsAt, tz) === dayYmd);
}

/** Narrow by optional branch and staff filters. */
export function applyFilters(
  appts: AgendaAppointment[],
  branchId: string | null,
  staffId: string | null
): AgendaAppointment[] {
  return appts.filter(
    (a) =>
      (!branchId || a.branchId === branchId) &&
      (!staffId || a.staffId === staffId)
  );
}

/** Absolute position of a card within a day timeline (px). */
export function cardLayout(
  startsAt: string,
  endsAt: string,
  tz: string
): { top: number; height: number } {
  const startMin = localMinutes(startsAt, tz) - DAY_START_HOUR * 60;
  const durationMin = Math.max(
    0,
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000
  );
  const pxPerMin = HOUR_PX / 60;
  return {
    top: Math.max(0, startMin * pxPerMin),
    height: Math.max(MIN_CARD_PX, durationMin * pxPerMin),
  };
}

/** The hour labels rendered down the timeline gutter. */
export function timelineHours(): number[] {
  return Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i
  );
}

/**
 * UTC window to fetch so the client can navigate `backDays`..`forwardDays`
 * around today without a round-trip. Boundaries land on local midnight.
 */
export function agendaFetchWindow(
  now: Date,
  tz: string,
  backDays = 7,
  forwardDays = 35
): { start: string; end: string } {
  const today = todayYmd(now, tz);
  return {
    start: localTimeToUTC(addDaysYmd(today, -backDays), "00:00", tz).toISOString(),
    end: localTimeToUTC(addDaysYmd(today, forwardDays), "00:00", tz).toISOString(),
  };
}

/** Resolve the business timezone from its branches (first active, else first). */
export function resolveBusinessTimezone(
  branches: Array<{ timezone: string; is_active: boolean }>
): string {
  return (
    branches.find((b) => b.is_active)?.timezone ?? branches[0]?.timezone ?? DEFAULT_TZ
  );
}
