"use client";

import { cardLayout, type AgendaAppointment } from "@/lib/dashboard/agenda-data";
import { STATUS_TOKEN } from "@/components/dashboard/StatusBadge";
import { formatTime } from "@/lib/format/date";

interface AppointmentCardProps {
  appt: AgendaAppointment;
  tz: string;
  locale: string;
  onSelect: (id: string) => void;
}

export function AppointmentCard({ appt, tz, locale, onSelect }: AppointmentCardProps) {
  const { top, height } = cardLayout(appt.startsAt, appt.endsAt, tz);
  const color = `var(${STATUS_TOKEN[appt.status] ?? "--color-text-muted"})`;

  return (
    <button
      type="button"
      onClick={() => onSelect(appt.id)}
      style={{ top, height, borderLeftColor: color }}
      className="absolute inset-x-1 overflow-hidden rounded-[var(--radius-button)] border border-[var(--border-subtle)] border-l-2 bg-[var(--color-bg-elevated)] px-2 py-1 text-left transition-colors hover:bg-[var(--color-bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-violet)]"
      aria-label={`${appt.clientName} · ${appt.serviceName} · ${formatTime(appt.startsAt, locale)}`}
    >
      <span className="block truncate text-xs font-medium text-[var(--color-text-primary)]">
        {formatTime(appt.startsAt, locale)} {appt.clientName}
      </span>
      <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
        {appt.serviceName}
      </span>
    </button>
  );
}

export default AppointmentCard;
