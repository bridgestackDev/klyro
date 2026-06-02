import { Logo } from "@/components/shared/Logo";
import { AppointmentRow, type AppointmentRowProps } from "./AppointmentRow";

export type TodayAppointmentItem = AppointmentRowProps & { id: string };

interface TodayAppointmentsProps {
  appointments: TodayAppointmentItem[];
  /** Localized empty-state heading. */
  emptyTitle: string;
}

export function TodayAppointments({
  appointments,
  emptyTitle,
}: TodayAppointmentsProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-6 py-12 text-center">
        <Logo variant="mark" className="opacity-60" />
        <p className="text-sm text-[var(--color-text-muted)]">{emptyTitle}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)]">
      {appointments.map((appt) => (
        <AppointmentRow key={appt.id} {...appt} />
      ))}
    </div>
  );
}

export default TodayAppointments;
