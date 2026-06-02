"use client";

import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  HOUR_PX,
  timelineHours,
  type AgendaAppointment,
} from "@/lib/dashboard/agenda-data";
import { AppointmentCard } from "./AppointmentCard";

const TIMELINE_PX = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

/** The positioned body shared by the day view and each week-grid column. */
export function DayColumnBody({
  appts,
  tz,
  locale,
  onSelect,
}: {
  appts: AgendaAppointment[];
  tz: string;
  locale: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative" style={{ height: TIMELINE_PX }}>
      {timelineHours().map((h) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-[var(--border-subtle)]"
          style={{ top: (h - DAY_START_HOUR) * HOUR_PX }}
        />
      ))}
      {appts.map((appt) => (
        <AppointmentCard
          key={appt.id}
          appt={appt}
          tz={tz}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface DayColumnProps {
  appts: AgendaAppointment[];
  tz: string;
  locale: string;
  onSelect: (id: string) => void;
  emptyLabel: string;
}

/** Single-day timeline with an hour gutter on the left. */
export function DayColumn({ appts, tz, locale, onSelect, emptyLabel }: DayColumnProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-3">
      {appts.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          {emptyLabel}
        </p>
      ) : (
        <div className="flex">
          <div className="relative w-12 shrink-0" style={{ height: TIMELINE_PX }}>
            {timelineHours().map((h) => (
              <span
                key={h}
                className="absolute -translate-y-1/2 text-[11px] tabular-nums text-[var(--color-text-muted)]"
                style={{ top: (h - DAY_START_HOUR) * HOUR_PX }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div className="flex-1">
            <DayColumnBody appts={appts} tz={tz} locale={locale} onSelect={onSelect} />
          </div>
        </div>
      )}
    </div>
  );
}

export default DayColumn;
