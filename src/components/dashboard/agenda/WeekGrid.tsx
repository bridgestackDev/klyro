"use client";

import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  HOUR_PX,
  timelineHours,
  appointmentsForDay,
  type AgendaAppointment,
} from "@/lib/dashboard/agenda-data";
import { DayColumnBody } from "./DayColumn";
import { formatDate } from "@/lib/format/date";

const TIMELINE_PX = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_PX;

interface WeekGridProps {
  days: string[]; // 7 YYYY-MM-DD strings (Mon..Sun)
  appts: AgendaAppointment[];
  tz: string;
  locale: string;
  todayYmd: string;
  onSelect: (id: string) => void;
}

/** 7-column week grid; horizontally scrollable on small screens. */
export function WeekGrid({ days, appts, tz, locale, todayYmd, onSelect }: WeekGridProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-3">
      <div className="flex min-w-[640px]">
        {/* Shared hour gutter */}
        <div className="w-12 shrink-0">
          <div className="h-8" aria-hidden />
          <div className="relative" style={{ height: TIMELINE_PX }}>
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
        </div>

        {/* 7 day columns */}
        {days.map((day) => {
          const dayAppts = appointmentsForDay(appts, day, tz);
          const isToday = day === todayYmd;
          // Append T12:00 so the label renders the intended local day.
          const label = formatDate(`${day}T12:00:00`, locale);
          return (
            <div key={day} className="flex-1 border-l border-[var(--border-subtle)]">
              <div
                className={`flex h-8 items-center justify-center text-xs font-medium ${
                  isToday
                    ? "text-[var(--color-violet)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {label}
              </div>
              <DayColumnBody appts={dayAppts} tz={tz} locale={locale} onSelect={onSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekGrid;
